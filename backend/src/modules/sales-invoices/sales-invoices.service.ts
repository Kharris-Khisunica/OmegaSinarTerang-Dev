import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import {
  ApplyChangesResult,
  DocumentReviseService,
} from '../../core/document-revise/document-revise.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { TaxRateResolverService } from '../../core/tax-rates/tax-rate-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ActionType } from '../authorization-requests/action-type.enum';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Product } from '../products/entities/product.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrdersService } from '../sales-orders/sales-orders.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { Unit } from '../units/entities/unit.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { CreateSalesInvoiceLineDto } from './dto/create-sales-invoice-line.dto';
import { ReviewSalesInvoiceDto } from './dto/review-sales-invoice.dto';
import { ReviseSalesInvoiceDto } from './dto/revise-sales-invoice.dto';
import { SalesInvoiceQueryDto } from './dto/sales-invoice-query.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { VoidSalesInvoiceDto } from './dto/void-sales-invoice.dto';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
  SalesInvoicePrintStatus,
  SalesInvoiceReviewStatus,
} from './entities/sales-invoice.entity';

const SORTABLE_COLUMNS = ['invoiceNumber', 'invoiceDate', 'createdAt'] as const;

export interface CreateSalesInvoiceResult {
  salesInvoice: SalesInvoice;
  lines: SalesInvoiceLine[];
  journalEntry: JournalEntry;
  /** Terisi kalau ada baris yang membuat stok minus (CLAUDE.md §2.8) — bukan error. */
  stockWarnings: string[];
}

interface LineContext {
  dto: CreateSalesInvoiceLineDto;
  product: Product;
  unit: Unit;
  qtyBaseUnit: number;
}

interface ViolationLine {
  productId: string;
  productName: string;
  unitId: string;
  qtyInput: number;
  unitPrice: number;
  discountPercent: number | null;
  discountAmount: number | null;
  netUnitPrice: number;
  costBasisPerInputUnit: number;
}

/**
 * Hasil kalkulasi (§4 CLAUDE.md "Faktur Penjualan" + §2.17 batas jual-rugi) —
 * diekstrak dari create() supaya reviseInvoice() (paket R6) memakai rumus
 * PERSIS SAMA, bukan salinan yang bisa hanyut beda seiring waktu. Murni
 * baca+hitung, tidak menulis apa pun — aman dipanggil di luar maupun di
 * dalam transaction.
 */
interface InvoiceCalculation {
  lineContexts: LineContext[];
  grossCents: number[];
  lineDiscountCents: number[];
  lineNetCents: number[];
  subtotalCents: number;
  invoiceDiscountCents: number;
  outputVatCents: number;
  grossTotalCents: number;
  lineDiscountTotalCents: number;
  totalDiscountCents: number;
  totalAmountCents: number;
  violations: ViolationLine[];
}

/**
 * Faktur Penjualan (CLAUDE.md §4 "Faktur Penjualan", §2.17 batas jual-rugi) —
 * mengorkestrasi DocumentCounterService (nomor JL), SalesOrdersService
 * (validasi saluran PENGIRIMAN + konversi SO), StockRecorderService (FIFO
 * keluar per baris, SELALU dari gudang STORE — §3 "Lokasi tidak dipilih per
 * baris"), StepUpService (SELL_BELOW_COST, satu approval per FAKTUR bukan
 * per baris), ArAccountResolverService (akun piutang efektif), dan
 * JournalPosterService (jurnal metode BRUTO) dalam SATU transaction — pola
 * sama PurchaseInvoicesService, dipersempit sesuai CLAUDE.md §4 "Faktur
 * Penjualan": TIDAK ADA alokasi pro-rata diskon faktur ke baris (penjualan
 * tidak membentuk lot) dan PPN keluaran digerbangi HANYA company_is_pkp,
 * bukan per-baris seperti PPN masukan pembelian.
 *
 * Seluruh uang dihitung dalam sen integer (×100) untuk menghindari drift
 * float, sama seperti PurchaseInvoicesService.
 */
@Injectable()
export class SalesInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(SalesInvoice)
    private readonly salesInvoicesRepository: Repository<SalesInvoice>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly arAccountResolverService: ArAccountResolverService,
    private readonly taxRateResolverService: TaxRateResolverService,
    private readonly stepUpService: StepUpService,
    private readonly salesOrdersService: SalesOrdersService,
    private readonly printLockService: PrintLockService,
    private readonly voidEngineService: VoidEngineService,
    private readonly documentReviseService: DocumentReviseService,
  ) {}

  async create(
    dto: CreateSalesInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<CreateSalesInvoiceResult> {
    const invoiceDate = parseDateOnly(dto.invoiceDate);
    const dueDate = addDays(invoiceDate, dto.termDays);

    // Diskon penjualan DI-DROP (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B A1,
    // paket R5) — DTO sudah menolaknya lewat @Equals(0) untuk jalur HTTP
    // asli, tapi dicek ULANG di sini supaya pemanggil service langsung
    // (dan seluruh test) tetap terlindungi, pola sama
    // validateDiscountAlternative() di bawah.
    this.assertSalesDiscountDropped(dto);

    this.validateDiscountAlternative(
      dto.invoiceDiscountPercent,
      dto.invoiceDiscountAmount,
      'faktur',
    );
    dto.lines.forEach((line, index) =>
      this.validateDiscountAlternative(
        line.discountPercent,
        line.discountAmount,
        `baris ${index + 1}`,
      ),
    );

    const customer = await this.dataSource.manager.findOne(Customer, {
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new BadRequestException(
        `Pelanggan ${dto.customerId} tidak ditemukan.`,
      );
    }
    if (!customer.isActive) {
      throw new BadRequestException('Pelanggan ini tidak aktif.');
    }

    // Validasi murni (tidak menulis apa pun) — sekali saja, sebelum transaction.
    // WAJIB sebelum resolveSalesman() di bawah — PENGIRIMAN mengambil
    // salesman dari SO, dan SO itu sendiri baru boleh dipercaya ada/OPEN/
    // milik pelanggan yang sama setelah lolos pemeriksaan ini.
    await this.salesOrdersService.assertChannelSalesOrderRequirement(
      dto.salesChannel,
      dto.salesOrderId ?? null,
      dto.customerId,
      this.dataSource.manager,
    );

    const salesman = await this.resolveSalesman(
      dto.salesOrderId ?? null,
      dto.salesmanId,
      this.dataSource.manager,
    );

    const storeWarehouse = await this.resolveStoreWarehouse(
      this.dataSource.manager,
    );
    const {
      lineContexts,
      grossCents,
      lineDiscountCents,
      lineNetCents,
      subtotalCents,
      invoiceDiscountCents,
      outputVatCents,
      grossTotalCents,
      lineDiscountTotalCents,
      totalDiscountCents,
      totalAmountCents,
      violations,
    } = await this.calculateInvoice(dto, invoiceDate, this.dataSource.manager);

    let payload: Record<string, unknown> | null = null;
    let contextSummary = '';
    if (violations.length > 0) {
      payload = {
        customerId: dto.customerId,
        invoiceDate: dto.invoiceDate,
        lines: violations.map((v) => ({
          productId: v.productId,
          unitId: v.unitId,
          qtyInput: v.qtyInput,
          unitPrice: v.unitPrice,
          discountPercent: v.discountPercent,
          discountAmount: v.discountAmount,
        })),
      };
      // CLAUDE.md §17: nilai batas TIDAK DITAMPILKAN ke operator -- hanya
      // nama produk, pola sama WarehouseMutationsService.buildContextSummary()
      // (BS_TO_STORE) yang juga tidak menyertakan angka bermakna. StepUpDialog
      // FE menampilkan contextSummary ini APA ADANYA, jadi angka Rp tidak
      // boleh pernah masuk ke string ini.
      contextSummary = `Faktur ${customer.name}: ${violations.length} baris di bawah harga pokok — ${violations
        .map((v) => v.productName)
        .join(', ')}`;

      if (!authorizationRequestId) {
        // WAJIB tanpa manager — baris authorization_requests baru harus
        // SELAMAT dari rollback (pola sama WarehouseMutationsService.create()
        // untuk BS_TO_STORE, satu-satunya precedent step-up dinamis
        // multi-baris di codebase ini).
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.SELL_BELOW_COST,
          payload,
          contextSummary,
        });
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (violations.length > 0 && payload) {
        // Konsumsi approval ATOMIC dengan penulisan dokumen — gagal di
        // tengah berarti approval tetap APPROVED dan bisa dipakai ulang
        // (CLAUDE.md §19).
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.SELL_BELOW_COST,
          payload,
          contextSummary,
          authorizationRequestId,
          manager,
        });
      }

      const invoiceNumber = await this.documentCounterService.getNextNumber(
        'SALES_INVOICE',
        invoiceDate,
        manager,
      );

      const arAccountId = await this.arAccountResolverService.resolve(
        customer,
        manager,
      );

      const invoice = await manager.save(
        SalesInvoice,
        manager.create(SalesInvoice, {
          invoiceNumber,
          invoiceDate: toDateOnlyString(invoiceDate),
          customerId: customer.id,
          salesChannel: dto.salesChannel,
          salesOrderId: dto.salesOrderId ?? null,
          salesmanId: salesman.id,
          termDays: dto.termDays,
          dueDate: toDateOnlyString(dueDate),
          subtotal: fromCents(subtotalCents).toFixed(2),
          lineDiscountTotal: fromCents(lineDiscountTotalCents).toFixed(2),
          invoiceDiscountAmount: fromCents(invoiceDiscountCents).toFixed(2),
          invoiceDiscountPercent:
            dto.invoiceDiscountPercent != null
              ? dto.invoiceDiscountPercent.toFixed(2)
              : null,
          outputVatAmount: fromCents(outputVatCents).toFixed(2),
          totalAmount: fromCents(totalAmountCents).toFixed(2),
          postingStatus: SalesInvoicePostingStatus.POSTED,
          printStatus: SalesInvoicePrintStatus.NOT_PRINTED,
          reviewStatus: SalesInvoiceReviewStatus.BELUM_DICEK,
          createdBy: user.sub,
        }),
      );

      const savedLines: SalesInvoiceLine[] = [];
      const stockWarnings: string[] = [];
      let totalCogsCents = 0;

      for (let i = 0; i < lineContexts.length; i++) {
        const ctx = lineContexts[i];
        // Stok minus diizinkan untuk penjualan (CLAUDE.md §2.8) — TIDAK set
        // disallowNegativeStock.
        const result = await this.stockRecorderService.recordOut(
          {
            productId: ctx.product.id,
            warehouseId: storeWarehouse.id,
            qtyBaseUnit: ctx.qtyBaseUnit,
            movementDate: invoiceDate,
            movementType: StockMovementType.SALE,
            sourceType: 'SALES_INVOICE',
            sourceId: invoice.id,
            createdBy: user.sub,
          },
          manager,
        );
        if (result.stockWarning) {
          stockWarnings.push(result.stockWarning);
        }
        // unit_cost_fifo WAJIB dari sini (retur penjualan Hari 23 memakainya
        // apa adanya, CLAUDE.md §3 "Lain-lain") — jangan hitung ulang.
        const unitCostFifo = result.totalCost / ctx.qtyBaseUnit;
        totalCogsCents += toCents(result.totalCost);

        const line = await manager.save(
          SalesInvoiceLine,
          manager.create(SalesInvoiceLine, {
            salesInvoiceId: invoice.id,
            customerId: customer.id,
            lineOrder: i + 1,
            productId: ctx.product.id,
            unitId: ctx.unit.id,
            qtyInput: ctx.dto.qtyInput.toFixed(4),
            qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
            unitPrice: ctx.dto.unitPrice.toFixed(2),
            discountPercent:
              ctx.dto.discountPercent != null
                ? ctx.dto.discountPercent.toFixed(2)
                : null,
            discountAmount: fromCents(lineDiscountCents[i]).toFixed(2),
            grossAmount: fromCents(grossCents[i]).toFixed(2),
            netAmount: fromCents(lineNetCents[i]).toFixed(2),
            unitCostFifo: unitCostFifo.toFixed(4),
          }),
        );
        savedLines.push(line);
      }

      if (dto.salesOrderId) {
        await this.salesOrdersService.markConverted(dto.salesOrderId, manager);
      }

      // --- Jurnal metode BRUTO (CLAUDE.md §4) ------------------------------
      const revenueAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_revenue_account = true',
          'Pendapatan Penjualan',
          manager,
        );
      const cogsAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_cogs_account = true',
          'Harga Pokok Penjualan',
          manager,
        );

      const journalLines: PostJournalLineDto[] = [
        {
          accountId: arAccountId,
          debit: fromCents(totalAmountCents),
          credit: 0,
          description: `Piutang faktur penjualan ${invoiceNumber}`,
          customerId: customer.id,
        },
      ];

      if (totalDiscountCents > 0) {
        const discountAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_sales_discount_account = true',
            'Diskon Penjualan',
            manager,
          );
        journalLines.push({
          accountId: discountAccountId,
          debit: fromCents(totalDiscountCents),
          credit: 0,
          description: `Diskon penjualan faktur ${invoiceNumber}`,
        });
      }

      journalLines.push({
        accountId: revenueAccountId,
        debit: 0,
        credit: fromCents(grossTotalCents),
        description: `Pendapatan faktur penjualan ${invoiceNumber}`,
      });

      if (outputVatCents > 0) {
        const outputVatAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_output_vat_account = true',
            'PPN Keluaran',
            manager,
          );
        journalLines.push({
          accountId: outputVatAccountId,
          debit: 0,
          credit: fromCents(outputVatCents),
          description: `PPN Keluaran faktur ${invoiceNumber}`,
        });
      }

      // totalCogsCents bisa 0 kalau produk belum pernah punya lot sama
      // sekali (stok minus dari nol) — baris jurnal bernilai nol ditolak
      // JournalPosterService (validasi "satu sisi > 0"), jadi dilewati sama
      // seperti baris kondisional lain di atas.
      if (totalCogsCents > 0) {
        const inventoryAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_inventory_account = true',
            'Persediaan',
            manager,
          );
        journalLines.push({
          accountId: cogsAccountId,
          debit: fromCents(totalCogsCents),
          credit: 0,
          description: `HPP faktur penjualan ${invoiceNumber}`,
        });
        journalLines.push({
          accountId: inventoryAccountId,
          debit: 0,
          credit: fromCents(totalCogsCents),
          description: `Persediaan (HPP) faktur penjualan ${invoiceNumber}`,
        });
      }

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: invoiceDate,
          description: `Faktur Penjualan ${invoiceNumber}`,
          sourceType: 'SALES_INVOICE',
          sourceId: invoice.id,
          createdBy: user.sub,
          lines: journalLines,
        },
        manager,
      );

      return {
        salesInvoice: invoice,
        lines: savedLines,
        journalEntry,
        stockWarnings,
      };
    });
  }

  // Dipakai ulang oleh Pengecekan Invoice Harian (Hari 22A) lewat
  // ?reviewStatus= — jangan bikin endpoint /supervisor/* terpisah
  // (KONTEKS_REVISI §2.2).
  async findAll(
    query: SalesInvoiceQueryDto,
  ): Promise<PaginatedResult<SalesInvoice>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'invoiceDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.salesInvoicesRepository.createQueryBuilder('invoice');
    if (query.search) {
      qb.andWhere('invoice.invoiceNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.customerId) {
      qb.andWhere('invoice.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.reviewStatus) {
      qb.andWhere('invoice.reviewStatus = :reviewStatus', {
        reviewStatus: query.reviewStatus,
      });
    }
    if (query.date) {
      qb.andWhere('invoice.invoiceDate = :date', { date: query.date });
    }

    qb.orderBy(`invoice.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<SalesInvoice> {
    const invoice = await this.salesInvoicesRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!invoice) {
      throw new BadRequestException('Faktur penjualan tidak ditemukan.');
    }
    return invoice;
  }

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). print_count
   * masuk audit_logs lewat @Audit('PRINT', ...) di controller, bukan di sini.
   * Response ini SUDAH memuat revisionNumber + postingStatus (VOID marker) —
   * tidak perlu DTO cetak terpisah.
   */
  async registerPrint(id: string): Promise<SalesInvoice> {
    await this.printLockService.registerPrint({
      table: 'sales_invoices',
      sourceType: 'SALES_INVOICE',
      documentId: id,
    });
    return this.findOne(id);
  }

  /**
   * Pengecekan Invoice Harian (Hari 22A, CLAUDE.md §5) — supervisor menandai
   * review_status TANPA PERNAH menulis isi faktur. HANYA 4 kolom review yang
   * disentuh di sini; tidak pernah lewat update()/PrintLockService/VoidEngine.
   * Setelah-fakta, tidak memblokir operator mencetak/lanjut kerja.
   */
  async review(
    id: string,
    dto: ReviewSalesInvoiceDto,
    user: AuthenticatedUser,
  ): Promise<SalesInvoice> {
    if (
      dto.reviewStatus === SalesInvoiceReviewStatus.BERMASALAH &&
      !dto.reviewNote?.trim()
    ) {
      throw new BadRequestException(
        'Catatan wajib diisi saat menandai faktur BERMASALAH.',
      );
    }
    await this.salesInvoicesRepository.update(id, {
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
      reviewedBy: user.sub,
      reviewedAt: new Date(),
    });
    return this.findOne(id);
  }

  /**
   * Edit BERSYARAT — scope sengaja sempit, pola sama
   * PurchaseInvoicesService.update() tapi field yang aman diedit lebih
   * sedikit: faktur penjualan cuma punya satu tanggal (invoiceDate) dan itu
   * SUDAH jadi entryDate jurnal saat posting, jadi tidak boleh diedit di
   * sini. Hanya salesmanId (FK, wajib divalidasi ulang) dan termDays
   * (menghitung ulang dueDate dari invoiceDate yang TERSIMPAN, bukan dari
   * input) yang aman. Digerbangi kunci cetak (PrintLockService) — TIDAK ada
   * assertLotsUnconsumed di sini (lihat SalesInvoiceVoidHook: faktur
   * penjualan tidak pernah membuat lot, jadi pemeriksaan itu vacuous).
   */
  async update(
    id: string,
    dto: UpdateSalesInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<SalesInvoice> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === SalesInvoicePostingStatus.VOIDED) {
      throw new BadRequestException(
        'Faktur ini sudah VOID, tidak bisa diedit.',
      );
    }

    let salesman: Salesman | null = null;
    if (dto.salesmanId) {
      // Terkunci ikut SO (koreksi 02 Okt 2026) — salesman faktur yang
      // merujuk Sales Order mengikuti PJ SO itu, tidak boleh diam-diam
      // diganti lewat edit sesudahnya. Jalan keluarnya VOID + faktur baru
      // (atau revisi penuh lewat reviseInvoice(), yang mengevaluasi ulang
      // salesOrderId -> salesman apa adanya, bukan patch sebagian seperti
      // di sini).
      if (existing.salesOrderId) {
        throw new BadRequestException(
          'Salesman pada faktur ini mengikuti Sales Order dan tidak bisa diubah langsung di sini.',
        );
      }
      salesman = await this.dataSource.manager.findOne(Salesman, {
        where: { id: dto.salesmanId },
      });
      if (!salesman) {
        throw new BadRequestException(
          `Salesman ${dto.salesmanId} tidak ditemukan.`,
        );
      }
      if (!salesman.isActive) {
        throw new BadRequestException('Salesman ini tidak aktif.');
      }
    }

    // WAJIB tanpa manager — kalau faktur sudah PRINTED dan belum ada
    // authorizationRequestId, baris authorization_requests baru TIDAK BOLEH
    // ikut rollback transaction di bawah (pola sama
    // PurchaseInvoicesService.update()).
    await this.printLockService.preflight({
      table: 'sales_invoices',
      sourceType: 'SALES_INVOICE',
      documentId: id,
      documentLabel: existing.invoiceNumber,
      intent: 'EDIT',
      reason: dto.reason,
      user,
      authorizationRequestId,
    });

    return this.dataSource.transaction(async (manager) => {
      // No-op kalau faktur belum pernah dicetak — edit bebas tanpa approval
      // apa pun (CLAUDE.md §2.16 literal).
      await this.printLockService.consume({
        table: 'sales_invoices',
        sourceType: 'SALES_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });

      const termDays = dto.termDays ?? existing.termDays;
      const dueDate = addDays(parseDateOnly(existing.invoiceDate), termDays);

      await manager.update(SalesInvoice, id, {
        salesmanId: salesman?.id ?? existing.salesmanId,
        termDays,
        dueDate: toDateOnlyString(dueDate),
      });

      const updated = await manager.findOne(SalesInvoice, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Faktur penjualan tidak ditemukan.');
      }
      return updated;
    });
  }

  /**
   * VOID lewat VoidEngineService + SalesInvoiceVoidHook, digerbangi DUA gate
   * step-up independen (lihat komentar panjang di SalesInvoicesController.
   * voidInvoice() untuk alasannya):
   *   1. UNLOCK_PRINT (PrintLockService) — semua role, hanya kalau PRINTED.
   *   2. VOID_DOCUMENT (StepUpService langsung, pola sama SELL_BELOW_COST di
   *      create()) — HANYA role OPERATOR, tidak peduli status cetak
   *      (CLAUDE.md §2.13, "VOID oleh Operator wajib step-up").
   * Keduanya dicek SEBELUM transaction dibuka (baris authorization_requests
   * baru tidak boleh ikut rollback) dan dikonsumsi DI DALAM transaction
   * (atomic dengan VOID sungguhan).
   */
  async voidInvoice(
    id: string,
    dto: VoidSalesInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    voidAuthorizationRequestId: string | undefined,
  ): Promise<SalesInvoice> {
    const existing = await this.findOne(id);
    const unlockReason = dto.unlockReason ?? dto.reasonNote;

    await this.printLockService.preflight({
      table: 'sales_invoices',
      sourceType: 'SALES_INVOICE',
      documentId: id,
      documentLabel: existing.invoiceNumber,
      intent: 'VOID',
      reason: unlockReason,
      user,
      authorizationRequestId,
    });

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'SALES_INVOICE', sourceId: id };
    const voidContextSummary = `VOID faktur ${existing.invoiceNumber}: ${dto.reasonNote}`;

    if (needsVoidApproval && !voidAuthorizationRequestId) {
      // WAJIB tanpa manager — sama alasannya dengan preflight() di atas.
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.VOID_DOCUMENT,
        payload: voidPayload,
        contextSummary: voidContextSummary,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'sales_invoices',
        sourceType: 'SALES_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'VOID',
        reason: unlockReason,
        user,
        authorizationRequestId,
        manager,
      });

      if (needsVoidApproval) {
        // authorizationRequestId DIJAMIN terisi kalau sampai sini — kalau
        // tidak, cabang preflight di atas sudah melempar 412 duluan.
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.VOID_DOCUMENT,
          payload: voidPayload,
          contextSummary: voidContextSummary,
          authorizationRequestId: voidAuthorizationRequestId,
          manager,
        });
      }

      await this.voidEngineService.voidDocument({
        sourceType: 'SALES_INVOICE',
        sourceId: id,
        reasonCode: dto.reasonCode,
        reasonNote: dto.reasonNote,
        userId: user.sub,
        manager,
      });
    });

    return this.findOne(id);
  }

  /**
   * Revisi-di-tempat (paket R6, docs/RENCANA_REVISI_TESTING_KLIEN.md §2A
   * K1-K4, §3) — nomor faktur TETAP, jurnal+stok lama dibalik lalu diposting
   * ulang di dalam SATU transaction, bertanggal dokumen ASLI (K2, bukan hari
   * ini seperti VOID). Layar edit PENUH: ReviseSalesInvoiceDto mewarisi
   * SELURUH validasi CreateSalesInvoiceDto, jadi rumus (calculateInvoice) dan
   * batas jual-rugi (§2.17) dievaluasi ULANG pada harga hasil revisi — kalau
   * tidak, revisi jadi pintu belakang: simpan dengan harga aman, revisi ke
   * harga rugi tanpa otorisasi.
   *
   * Jendela revisi = batas backdate PeriodLockValidator (K3), ditegakkan di
   * DALAM DocumentReviseService.revise() atas invoiceDate LAMA (existing,
   * SEBELUM dto diterapkan) — bukan diperiksa dua kali di sini.
   *
   * Gerbang otorisasi PAKAI YANG SUDAH ADA (K4): PrintLockService untuk
   * PRINTED (sama seperti update()), StepUpService/SELL_BELOW_COST untuk
   * pelanggaran harga (sama seperti create()) — tidak ada ActionType atau
   * payload matcher baru.
   */
  async reviseInvoice(
    id: string,
    dto: ReviseSalesInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    sellBelowCostAuthorizationRequestId: string | undefined,
  ): Promise<SalesInvoice & { stockWarnings: string[] }> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === SalesInvoicePostingStatus.VOIDED) {
      throw new BadRequestException(
        'Faktur ini sudah VOID, tidak bisa direvisi.',
      );
    }
    // Peringatan stok minus (§2.8) dari posting ulang — dikembalikan ke FE
    // seperti create() (need_fixing.md #29 lanjutan, 6 Okt 2026).
    const stockWarnings: string[] = [];

    this.assertSalesDiscountDropped(dto);
    this.validateDiscountAlternative(
      dto.invoiceDiscountPercent,
      dto.invoiceDiscountAmount,
      'faktur',
    );
    dto.lines.forEach((line, index) =>
      this.validateDiscountAlternative(
        line.discountPercent,
        line.discountAmount,
        `baris ${index + 1}`,
      ),
    );

    const customer = await this.dataSource.manager.findOne(Customer, {
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new BadRequestException(
        `Pelanggan ${dto.customerId} tidak ditemukan.`,
      );
    }
    if (!customer.isActive) {
      throw new BadRequestException('Pelanggan ini tidak aktif.');
    }

    const invoiceDate = parseDateOnly(dto.invoiceDate);
    const dueDate = addDays(invoiceDate, dto.termDays);

    // Urutan WAJIB sama seperti create(): assertChannelSalesOrderRequirement()
    // dulu, baru resolveSalesman() — lihat komentar di create().
    await this.salesOrdersService.assertChannelSalesOrderRequirement(
      dto.salesChannel,
      dto.salesOrderId ?? null,
      dto.customerId,
      this.dataSource.manager,
    );

    const salesman = await this.resolveSalesman(
      dto.salesOrderId ?? null,
      dto.salesmanId,
      this.dataSource.manager,
    );

    const storeWarehouse = await this.resolveStoreWarehouse(
      this.dataSource.manager,
    );
    const {
      lineContexts,
      grossCents,
      lineDiscountCents,
      lineNetCents,
      subtotalCents,
      invoiceDiscountCents,
      outputVatCents,
      grossTotalCents,
      totalDiscountCents,
      lineDiscountTotalCents,
      totalAmountCents,
      violations,
    } = await this.calculateInvoice(dto, invoiceDate, this.dataSource.manager);

    let payload: Record<string, unknown> | null = null;
    let contextSummary = '';
    if (violations.length > 0) {
      payload = {
        customerId: dto.customerId,
        invoiceDate: dto.invoiceDate,
        lines: violations.map((v) => ({
          productId: v.productId,
          unitId: v.unitId,
          qtyInput: v.qtyInput,
          unitPrice: v.unitPrice,
          discountPercent: v.discountPercent,
          discountAmount: v.discountAmount,
        })),
      };
      contextSummary = `Revisi faktur ${existing.invoiceNumber} ke ${customer.name}: ${violations.length} baris di bawah harga pokok — ${violations
        .map((v) => v.productName)
        .join(', ')}`;

      if (!sellBelowCostAuthorizationRequestId) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.SELL_BELOW_COST,
          payload,
          contextSummary,
        });
      }
    }

    // WAJIB tanpa manager — sama alasannya dengan update()/voidInvoice() di
    // atas (baris authorization_requests baru tidak boleh ikut rollback).
    await this.printLockService.preflight({
      table: 'sales_invoices',
      sourceType: 'SALES_INVOICE',
      documentId: id,
      documentLabel: existing.invoiceNumber,
      intent: 'EDIT',
      reason: dto.reason,
      user,
      authorizationRequestId,
    });

    return this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'sales_invoices',
        sourceType: 'SALES_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });

      if (violations.length > 0 && payload) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.SELL_BELOW_COST,
          payload,
          contextSummary,
          authorizationRequestId: sellBelowCostAuthorizationRequestId,
          manager,
        });
      }

      // PrintLockService.consume() SUDAH menaikkan revision_number di atas
      // KALAU faktur ini PRINTED (K4) — jangan naikkan dua kali. Kalau belum
      // pernah dicetak, tidak ada yang menaikkannya sama sekali, jadi harus
      // dilakukan manual di sini.
      const wasPrinted =
        existing.printStatus === SalesInvoicePrintStatus.PRINTED;

      await this.documentReviseService.revise({
        sourceType: 'SALES_INVOICE',
        sourceId: id,
        originalDate: parseDateOnly(existing.invoiceDate),
        userId: user.sub,
        manager,
        reversalDescription: `Pembalik revisi faktur ${existing.invoiceNumber}`,
        applyChanges: async (manager): Promise<ApplyChangesResult> => {
          // Faktur yang sudah punya Surat Jalan atau Retur Penjualan tidak
          // boleh direvisi — sales_return_lines/delivery_order_lines
          // menunjuk sales_invoice_lines(id) lewat FK sungguhan (migration
          // CreateSalesReturns/CreateDeliveryOrders); menghapus baris lama
          // untuk menulis ulang akan gagal dengan pelanggaran FK di tengah
          // transaction, atau (kalau produk/qty ikut berubah) diam-diam
          // membuat surat jalan/retur yang sudah ada seolah merujuk barang
          // yang salah. VOID + faktur baru tetap jadi jalan keluarnya.
          await this.assertNoDownstreamSalesDocuments(id, manager);

          const arAccountId = await this.arAccountResolverService.resolve(
            customer,
            manager,
          );

          await manager.update(SalesInvoice, id, {
            customerId: customer.id,
            salesChannel: dto.salesChannel,
            salesOrderId: dto.salesOrderId ?? null,
            salesmanId: salesman.id,
            invoiceDate: toDateOnlyString(invoiceDate),
            termDays: dto.termDays,
            dueDate: toDateOnlyString(dueDate),
            subtotal: fromCents(subtotalCents).toFixed(2),
            lineDiscountTotal: fromCents(lineDiscountTotalCents).toFixed(2),
            invoiceDiscountAmount: fromCents(invoiceDiscountCents).toFixed(2),
            invoiceDiscountPercent:
              dto.invoiceDiscountPercent != null
                ? dto.invoiceDiscountPercent.toFixed(2)
                : null,
            outputVatAmount: fromCents(outputVatCents).toFixed(2),
            totalAmount: fromCents(totalAmountCents).toFixed(2),
          });

          // Baris lama dihapus lalu ditulis ulang (BUKAN append-only seperti
          // journal_entries/stock_movements) — kebenaran historis tetap
          // hidup lewat jurnal pembalik+posting-ulang dan
          // stock_cost_consumptions, baris ini murni representasi TERKINI
          // dokumen (pola sama header yang di-UPDATE di atas). Aman karena
          // assertNoDownstreamSalesDocuments() di atas sudah memastikan
          // tidak ada dokumen lain yang menunjuk baris lama ini.
          await manager.delete(SalesInvoiceLine, { salesInvoiceId: id });

          const savedLines: SalesInvoiceLine[] = [];
          let totalCogsCents = 0;
          for (let i = 0; i < lineContexts.length; i++) {
            const ctx = lineContexts[i];
            const result = await this.stockRecorderService.recordOut(
              {
                productId: ctx.product.id,
                warehouseId: storeWarehouse.id,
                qtyBaseUnit: ctx.qtyBaseUnit,
                movementDate: invoiceDate,
                movementType: StockMovementType.SALE,
                sourceType: 'SALES_INVOICE',
                sourceId: id,
                createdBy: user.sub,
              },
              manager,
            );
            if (result.stockWarning) {
              stockWarnings.push(result.stockWarning);
            }
            const unitCostFifo = result.totalCost / ctx.qtyBaseUnit;
            totalCogsCents += toCents(result.totalCost);

            const line = await manager.save(
              SalesInvoiceLine,
              manager.create(SalesInvoiceLine, {
                salesInvoiceId: id,
                customerId: customer.id,
                lineOrder: i + 1,
                productId: ctx.product.id,
                unitId: ctx.unit.id,
                qtyInput: ctx.dto.qtyInput.toFixed(4),
                qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
                unitPrice: ctx.dto.unitPrice.toFixed(2),
                discountPercent:
                  ctx.dto.discountPercent != null
                    ? ctx.dto.discountPercent.toFixed(2)
                    : null,
                discountAmount: fromCents(lineDiscountCents[i]).toFixed(2),
                grossAmount: fromCents(grossCents[i]).toFixed(2),
                netAmount: fromCents(lineNetCents[i]).toFixed(2),
                unitCostFifo: unitCostFifo.toFixed(4),
              }),
            );
            savedLines.push(line);
          }

          // Hanya konversi SO kalau ini SO yang BELUM dikonversi oleh faktur
          // ini sendiri — markConverted() menolak SO yang sudah CONVERTED
          // (§2.9 sales-orders.service.ts). SO LAMA (kalau operator mengganti
          // salesOrderId saat revisi) SENGAJA tidak dikembalikan ke OPEN di
          // sini — di luar cakupan paket R6, catat sebagai keterbatasan.
          if (dto.salesOrderId && dto.salesOrderId !== existing.salesOrderId) {
            await this.salesOrdersService.markConverted(
              dto.salesOrderId,
              manager,
            );
          }

          // --- Jurnal metode BRUTO (CLAUDE.md §4) — rumus PERSIS create() ---
          const revenueAccountId =
            await this.accountResolverService.resolveSingleActive(
              'is_revenue_account = true',
              'Pendapatan Penjualan',
              manager,
            );
          const cogsAccountId =
            await this.accountResolverService.resolveSingleActive(
              'is_cogs_account = true',
              'Harga Pokok Penjualan',
              manager,
            );

          const journalLines: PostJournalLineDto[] = [
            {
              accountId: arAccountId,
              debit: fromCents(totalAmountCents),
              credit: 0,
              description: `Piutang faktur penjualan ${existing.invoiceNumber} (revisi)`,
              customerId: customer.id,
            },
          ];

          if (totalDiscountCents > 0) {
            const discountAccountId =
              await this.accountResolverService.resolveSingleActive(
                'is_sales_discount_account = true',
                'Diskon Penjualan',
                manager,
              );
            journalLines.push({
              accountId: discountAccountId,
              debit: fromCents(totalDiscountCents),
              credit: 0,
              description: `Diskon penjualan faktur ${existing.invoiceNumber} (revisi)`,
            });
          }

          journalLines.push({
            accountId: revenueAccountId,
            debit: 0,
            credit: fromCents(grossTotalCents),
            description: `Pendapatan faktur penjualan ${existing.invoiceNumber} (revisi)`,
          });

          if (outputVatCents > 0) {
            const outputVatAccountId =
              await this.accountResolverService.resolveSingleActive(
                'is_output_vat_account = true',
                'PPN Keluaran',
                manager,
              );
            journalLines.push({
              accountId: outputVatAccountId,
              debit: 0,
              credit: fromCents(outputVatCents),
              description: `PPN Keluaran faktur penjualan ${existing.invoiceNumber} (revisi)`,
            });
          }

          if (totalCogsCents > 0) {
            const inventoryAccountId =
              await this.accountResolverService.resolveSingleActive(
                'is_inventory_account = true',
                'Persediaan',
                manager,
              );
            journalLines.push({
              accountId: cogsAccountId,
              debit: fromCents(totalCogsCents),
              credit: 0,
              description: `HPP faktur penjualan ${existing.invoiceNumber} (revisi)`,
            });
            journalLines.push({
              accountId: inventoryAccountId,
              debit: 0,
              credit: fromCents(totalCogsCents),
              description: `Persediaan (HPP) faktur penjualan ${existing.invoiceNumber} (revisi)`,
            });
          }

          return {
            repostDate: invoiceDate,
            journalDescription: `Faktur Penjualan ${existing.invoiceNumber} (revisi)`,
            journalLines,
          };
        },
      });

      if (!wasPrinted) {
        await manager.increment(SalesInvoice, { id }, 'revisionNumber', 1);
      }

      const updated = await manager.findOne(SalesInvoice, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Faktur penjualan tidak ditemukan.');
      }
      return Object.assign(updated, { stockWarnings });
    });
  }

  // --- Helper ----------------------------------------------------------------

  private async resolveLineContexts(
    lines: CreateSalesInvoiceLineDto[],
    manager: EntityManager,
  ): Promise<LineContext[]> {
    const contexts: LineContext[] = [];
    for (const lineDto of lines) {
      const product = await manager.findOne(Product, {
        where: { id: lineDto.productId },
        relations: { unitConversions: true },
      });
      if (!product) {
        throw new BadRequestException(
          `Produk ${lineDto.productId} tidak ditemukan.`,
        );
      }
      const unit = await manager.findOne(Unit, {
        where: { id: lineDto.unitId },
      });
      if (!unit) {
        throw new BadRequestException(
          `Satuan ${lineDto.unitId} tidak ditemukan.`,
        );
      }
      const factor = this.resolveConversionFactor(product, unit);
      contexts.push({
        dto: lineDto,
        product,
        unit,
        qtyBaseUnit: roundTo(lineDto.qtyInput * factor, 4),
      });
    }
    return contexts;
  }

  // Duplikasi sengaja dari PurchaseInvoicesService.resolveConversionFactor()/
  // SalesOrdersService.resolveConversionFactor() — konvensi existing codebase
  // ini (dikonfirmasi Hari 19), bukan diekstrak jadi helper bersama.
  private resolveConversionFactor(product: Product, unit: Unit): number {
    const normalizedUnit = normalizeUnitName(unit.name);
    const normalizedBase = normalizeUnitName(product.baseUnit);
    if (normalizedUnit === normalizedBase) {
      return 1;
    }
    const match = product.unitConversions?.find(
      (conversion) => normalizeUnitName(conversion.unitName) === normalizedUnit,
    );
    if (!match) {
      throw new BadRequestException(
        `Produk ${product.displayName} tidak punya konversi untuk satuan "${unit.name}".`,
      );
    }
    return Number(match.qtyInBaseUnit);
  }

  private async getCompanyIsPkp(manager: EntityManager): Promise<boolean> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'company_is_pkp'`,
    );
    return rows[0]?.value === 'true';
  }

  /**
   * Resolusi salesman — "terkunci ikut SO" (koreksi 02 Okt 2026). Saluran
   * PENGIRIMAN SELALU merujuk SO (ditegakkan
   * assertChannelSalesOrderRequirement() SEBELUM method ini dipanggil, jadi
   * SO di sini DIJAMIN ada/OPEN/milik pelanggan yang sama) — salesman-nya
   * diambil dari sales_orders.salesman_id apa adanya, dto.salesmanId
   * DIABAIKAN total (bukan dipakai sebagai fallback) supaya operator tidak
   * bisa diam-diam mengganti PJ saat invoicing. Saluran TOKO tidak punya SO
   * sama sekali -> dto.salesmanId wajib diisi manual, pola lama yang tidak
   * berubah.
   */
  private async resolveSalesman(
    salesOrderId: string | null,
    dtoSalesmanId: string | undefined,
    manager: EntityManager,
  ): Promise<Salesman> {
    let salesmanId: string;
    if (salesOrderId) {
      const salesOrder = await manager.findOne(SalesOrder, {
        where: { id: salesOrderId },
      });
      // Tidak pernah null di titik ini —
      // assertChannelSalesOrderRequirement() sudah memastikan SO ini ada.
      salesmanId = salesOrder!.salesmanId;
    } else {
      if (!dtoSalesmanId) {
        throw new BadRequestException(
          'Salesman wajib diisi — saluran TOKO tidak punya Sales Order yang membawa salesman.',
        );
      }
      salesmanId = dtoSalesmanId;
    }

    const salesman = await manager.findOne(Salesman, {
      where: { id: salesmanId },
    });
    if (!salesman) {
      throw new BadRequestException(`Salesman ${salesmanId} tidak ditemukan.`);
    }
    if (!salesman.isActive) {
      throw new BadRequestException('Salesman ini tidak aktif.');
    }
    return salesman;
  }

  // Penjualan SELALU keluar dari STORE (CLAUDE.md §3 "Lokasi tidak dipilih
  // per baris — selalu STORE") — pola resolve sama
  // PurchaseInvoicesService.resolveStoreWarehouse().
  private async resolveStoreWarehouse(
    manager: EntityManager,
  ): Promise<Warehouse> {
    const defaultStore = await manager.findOne(Warehouse, {
      where: {
        warehouseType: WarehouseType.STORE,
        isDefault: true,
        isActive: true,
      },
    });
    if (defaultStore) {
      return defaultStore;
    }
    const anyStore = await manager.findOne(Warehouse, {
      where: { warehouseType: WarehouseType.STORE, isActive: true },
    });
    if (!anyStore) {
      throw new BadRequestException(
        'Gudang STORE aktif tidak ditemukan — periksa data gudang sebelum membuat faktur penjualan.',
      );
    }
    return anyStore;
  }

  // Diskon penjualan DI-DROP (paket R5) — kolom TETAP ada di skema (faktur
  // lama masih menyimpannya, dibaca apa adanya oleh Retur Penjualan), tapi
  // faktur BARU wajib 0 atau tidak dikirim sama sekali. Cek header DAN
  // setiap baris di SATU tempat sebelum kalkulasi apa pun dimulai.
  private assertSalesDiscountDropped(dto: CreateSalesInvoiceDto): void {
    const values = [
      dto.invoiceDiscountPercent,
      dto.invoiceDiscountAmount,
      ...dto.lines.flatMap((line) => [
        line.discountPercent,
        line.discountAmount,
      ]),
    ];
    if (values.some((value) => value != null && value !== 0)) {
      throw new BadRequestException(
        'Diskon penjualan sudah tidak dipakai — masukkan harga bersih langsung di kolom Harga.',
      );
    }
  }

  private validateDiscountAlternative(
    percent: number | undefined,
    amount: number | undefined,
    label: string,
  ): void {
    if (percent != null && percent > 0 && amount != null && amount > 0) {
      throw new BadRequestException(
        `Diskon ${label}: isi persen ATAU rupiah, bukan keduanya (alternatif, bukan bertingkat — CLAUDE.md §4).`,
      );
    }
  }

  /**
   * Rumus §4 CLAUDE.md "Faktur Penjualan" + batas jual-rugi §2.17 — diekstrak
   * dari create() (paket R6) supaya reviseInvoice() memakai rumus PERSIS
   * SAMA, bukan salinan yang bisa hanyut beda seiring waktu. Murni baca+
   * hitung (tidak menulis), aman dipanggil di luar transaction (violation-
   * check untuk step-up preflight, pola create()) maupun di dalamnya.
   */
  private async calculateInvoice(
    dto: Pick<
      CreateSalesInvoiceDto,
      'invoiceDiscountPercent' | 'invoiceDiscountAmount' | 'lines'
    >,
    invoiceDate: Date,
    manager: EntityManager,
  ): Promise<InvoiceCalculation> {
    const lineContexts = await this.resolveLineContexts(dto.lines, manager);

    const grossCents: number[] = [];
    const lineDiscountCents: number[] = [];
    const lineNetCents: number[] = [];
    let subtotalCents = 0;

    lineContexts.forEach((ctx) => {
      const grossC = toCents(ctx.dto.qtyInput * ctx.dto.unitPrice);
      const discC = ctx.dto.discountPercent
        ? Math.round((grossC * ctx.dto.discountPercent) / 100)
        : toCents(ctx.dto.discountAmount ?? 0);
      const netC = grossC - discC;
      grossCents.push(grossC);
      lineDiscountCents.push(discC);
      lineNetCents.push(netC);
      subtotalCents += netC;
    });

    const invoiceDiscountCents = dto.invoiceDiscountPercent
      ? Math.round((subtotalCents * dto.invoiceDiscountPercent) / 100)
      : toCents(dto.invoiceDiscountAmount ?? 0);
    if (invoiceDiscountCents > subtotalCents) {
      throw new BadRequestException(
        'Diskon faktur tidak boleh melebihi subtotal.',
      );
    }

    // PPN keluaran digerbangi HANYA company_is_pkp (CLAUDE.md §2.11) — status
    // PKP pelanggan TIDAK menentukan apakah PPN dipungut.
    const companyIsPkp = await this.getCompanyIsPkp(manager);
    let outputVatCents = 0;
    if (companyIsPkp) {
      const rate = await this.taxRateResolverService.getEffectiveRate(
        invoiceDate,
        manager,
      );
      if (rate > 0) {
        outputVatCents = Math.round(
          ((subtotalCents - invoiceDiscountCents) * rate) / 100,
        );
      }
    }

    const grossTotalCents = grossCents.reduce((sum, v) => sum + v, 0);
    const lineDiscountTotalCents = lineDiscountCents.reduce(
      (sum, v) => sum + v,
      0,
    );
    const totalDiscountCents = lineDiscountTotalCents + invoiceDiscountCents;
    // TIDAK ADA PEMBULATAN (CLAUDE.md §2.10) — eksak sampai sen, ditulis apa adanya.
    const totalAmountCents =
      subtotalCents - invoiceDiscountCents + outputVatCents;

    // --- Batas jual di bawah harga pokok (CLAUDE.md §2.17) ----------------
    const violations: ViolationLine[] = [];
    for (let i = 0; i < lineContexts.length; i++) {
      const ctx = lineContexts[i];
      const costBasisPerBaseUnit =
        await this.stockRecorderService.getLatestCostBasis(ctx.product.id);
      if (costBasisPerBaseUnit === 0) {
        // Belum pernah dibeli (atau seluruh lot berharga nol) -> tidak ada
        // batas, bukan error (CLAUDE.md §2.17).
        continue;
      }
      const costBasisPerInputUnit =
        (costBasisPerBaseUnit * ctx.qtyBaseUnit) / ctx.dto.qtyInput;
      const netUnitPrice = fromCents(lineNetCents[i]) / ctx.dto.qtyInput;
      if (netUnitPrice < costBasisPerInputUnit) {
        violations.push({
          productId: ctx.product.id,
          productName: ctx.product.displayName,
          unitId: ctx.unit.id,
          qtyInput: ctx.dto.qtyInput,
          unitPrice: ctx.dto.unitPrice,
          discountPercent: ctx.dto.discountPercent ?? null,
          discountAmount: ctx.dto.discountAmount ?? null,
          netUnitPrice,
          costBasisPerInputUnit,
        });
      }
    }

    return {
      lineContexts,
      grossCents,
      lineDiscountCents,
      lineNetCents,
      subtotalCents,
      invoiceDiscountCents,
      outputVatCents,
      grossTotalCents,
      lineDiscountTotalCents,
      totalDiscountCents,
      totalAmountCents,
      violations,
    };
  }

  /**
   * Gerbang revisi (paket R6): sales_return_lines DAN delivery_order_lines
   * menunjuk sales_invoice_lines(id) lewat FK sungguhan (REFERENCES, bukan
   * kolom UUID polos) — migration 1785080602955-CreateSalesReturns.ts:77 dan
   * 1785080602959-CreateDeliveryOrders.ts:76. Menghapus baris lama untuk
   * menulis ulang (reviseInvoice()) akan gagal FK di tengah transaction kalau
   * salah satunya sudah ada, atau — kalau baris tetap dipertahankan tapi
   * kontennya diam-diam berubah — membuat surat jalan/retur yang sudah
   * dicetak/diproses seolah merujuk produk/qty yang berbeda dari yang
   * sungguhan terjadi. Diperiksa SEBELUM DELETE, bukan ditangkap dari error
   * Postgres, supaya pesannya jelas dan menyebut jalan keluarnya.
   */
  private async assertNoDownstreamSalesDocuments(
    salesInvoiceId: string,
    manager: EntityManager,
  ): Promise<void> {
    const rows: { exists: boolean }[] = await manager.query(
      `SELECT EXISTS (
         SELECT 1 FROM delivery_order_lines d
         JOIN sales_invoice_lines l ON l.id = d.sales_invoice_line_id
         WHERE l.sales_invoice_id = $1
         UNION ALL
         SELECT 1 FROM sales_return_lines r
         JOIN sales_invoice_lines l ON l.id = r.sales_invoice_line_id
         WHERE l.sales_invoice_id = $1
       ) AS exists`,
      [salesInvoiceId],
    );
    if (rows[0]?.exists) {
      throw new BadRequestException(
        'Faktur ini sudah punya Surat Jalan atau Retur Penjualan yang merujuk baris-barisnya — tidak bisa direvisi. Gunakan VOID lalu terbitkan faktur baru.',
      );
    }
  }
}

function normalizeUnitName(value: string): string {
  return value.trim().toLowerCase();
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
