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
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { TaxRateResolverService } from '../../core/tax-rates/tax-rate-resolver.service';
import { VoidEngineService } from '../../core/void/void.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ActionType } from '../authorization-requests/action-type.enum';
import { Role } from '../../common/enums/role.enum';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { Unit } from '../units/entities/unit.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { CreatePurchaseInvoiceLineDto } from './dto/create-purchase-invoice-line.dto';
import { ReviewPurchaseInvoiceDto } from './dto/review-purchase-invoice.dto';
import { RevisePurchaseInvoiceDto } from './dto/revise-purchase-invoice.dto';
import { PurchaseInvoiceQueryDto } from './dto/purchase-invoice-query.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { VoidPurchaseInvoiceDto } from './dto/void-purchase-invoice.dto';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { PurchaseInvoiceLine } from './entities/purchase-invoice-line.entity';
import {
  PurchaseInvoice,
  PurchaseInvoicePostingStatus,
  PurchaseInvoicePrintStatus,
  PurchaseInvoiceReviewStatus,
} from './entities/purchase-invoice.entity';

const SORTABLE_COLUMNS = ['invoiceNumber', 'receiptDate', 'createdAt'] as const;

export interface CreatePurchaseInvoiceResult {
  purchaseInvoice: PurchaseInvoice;
  lines: PurchaseInvoiceLine[];
  goodsReceipt: GoodsReceipt;
  goodsReceiptLines: GoodsReceiptLine[];
  journalEntry: JournalEntry;
}

interface LineContext {
  dto: CreatePurchaseInvoiceLineDto;
  product: Product;
  unit: Unit;
  qtyBaseUnit: number;
}

/**
 * Rumus §4 CLAUDE.md "Faktur Pembelian" (K5+K6) — diekstrak dari create()
 * (paket R6) supaya reviseInvoice() memakai rumus PERSIS SAMA. Murni
 * baca+hitung, aman dipanggil di luar maupun di dalam transaction.
 */
interface PurchaseInvoiceCalculation {
  lineContexts: LineContext[];
  grossCents: number[];
  subtotalCents: number;
  invoiceDiscountCents: number;
  inputVatCents: number[];
  inputVatTotalCents: number;
  costBasisCents: number[];
  unitCostResults: number[];
  totalAmountCents: number;
}

/**
 * Faktur Pembelian (CLAUDE.md §4 "Faktur Pembelian", §2.4 pembelian) —
 * dokumen pertama yang menerbitkan nomor B1 sungguhan. Mengorkestrasi
 * DocumentCounterService (nomor), StockRecorderService (lot + movement per
 * baris, SELALU ke gudang STORE — §3 "Pembelian"), AccountResolverService
 * (akun Persediaan/Hutang/PPN Masukan/Diskon Pembelian tanpa hardcode kode),
 * dan JournalPosterService (jurnal) dalam SATU transaction — pola sama
 * OpeningBalanceService.
 *
 * Seluruh uang dihitung dalam sen integer (×100) untuk menghindari drift
 * float, meniru validasi balance JournalPosterService.
 *
 * Sejak paket R7 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2A, keputusan K5):
 * TIDAK ADA lagi diskon baris, TIDAK ADA lagi alokasi pro-rata diskon faktur
 * ke baris — harga_pokok[i] = baris[i] (+ PPN masukan kalau non-PKP), eksak,
 * tanpa residu pembulatan untuk dibebankan ke baris mana pun. Diskon faktur
 * (rupiah saja, mode persen di-drop) jadi baris jurnal kredit "Diskon
 * Pembelian" tersendiri (K6) — TIDAK PERNAH menyentuh lot.unit_cost.
 * Konsekuensi yang disengaja: nilai persediaan tercatat sebelum diskon
 * faktur, lebih tinggi dari uang yang dibayar ke supplier — jangan
 * "diperbaiki" tanpa perintah, pola sama catatan lot bonus di §3 CLAUDE.md.
 */
@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseInvoice)
    private readonly purchaseInvoicesRepository: Repository<PurchaseInvoice>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly taxRateResolverService: TaxRateResolverService,
    private readonly printLockService: PrintLockService,
    private readonly voidEngineService: VoidEngineService,
    private readonly documentReviseService: DocumentReviseService,
    private readonly stepUpService: StepUpService,
  ) {}

  async create(
    dto: CreatePurchaseInvoiceDto,
    user: AuthenticatedUser,
  ): Promise<CreatePurchaseInvoiceResult> {
    const receiptDate = parseDateOnly(dto.receiptDate);
    const supplierInvoiceDate = parseDateOnly(dto.supplierInvoiceDate);
    const dueDate = addDays(supplierInvoiceDate, dto.termDays);

    // Diskon baris & diskon faktur persen DI-DROP (docs/RENCANA_REVISI_TESTING_KLIEN.md
    // §2A, paket R7, keputusan K5) — DTO sudah menolaknya lewat @Equals(0)
    // untuk jalur HTTP asli, tapi dicek ULANG di sini supaya pemanggil
    // service langsung (dan seluruh test) tetap terlindungi, pola sama
    // SalesInvoicesService.assertSalesDiscountDropped().
    this.assertPurchaseDiscountShape(dto);

    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException(
          `Supplier ${dto.supplierId} tidak ditemukan.`,
        );
      }

      const companyIsPkp = await this.getCompanyIsPkp(manager);
      const storeWarehouse = await this.resolveStoreWarehouse(manager);

      const {
        lineContexts,
        grossCents,
        subtotalCents,
        invoiceDiscountCents,
        inputVatCents,
        inputVatTotalCents,
        costBasisCents,
        unitCostResults,
        totalAmountCents,
      } = await this.calculatePurchaseInvoice(
        dto,
        supplier,
        supplierInvoiceDate,
        companyIsPkp,
        manager,
      );

      const invoiceNumber = await this.documentCounterService.getNextNumber(
        'PURCHASE_INVOICE',
        receiptDate,
        manager,
      );

      const invoice = await manager.save(
        PurchaseInvoice,
        manager.create(PurchaseInvoice, {
          invoiceNumber,
          supplierId: supplier.id,
          supplierInvoiceNo: dto.supplierInvoiceNo,
          receiptDate: toDateOnlyString(receiptDate),
          supplierInvoiceDate: toDateOnlyString(supplierInvoiceDate),
          dueDate: toDateOnlyString(dueDate),
          termDays: dto.termDays,
          subtotal: fromCents(subtotalCents).toFixed(2),
          // Diskon baris DI-DROP (K5) — kolom dipertahankan untuk faktur
          // lama, faktur baru selalu 0 (dtolak DTO kalau != 0 di atas).
          lineDiscountTotal: '0.00',
          invoiceDiscountAmount: fromCents(invoiceDiscountCents).toFixed(2),
          // Mode persen faktur DI-DROP (K5) — kolom dipertahankan, faktur
          // baru selalu 0/null (ditolak DTO kalau != 0 di atas).
          invoiceDiscountPercent:
            dto.invoiceDiscountPercent != null
              ? dto.invoiceDiscountPercent.toFixed(2)
              : null,
          inputVatAmount: fromCents(inputVatTotalCents).toFixed(2),
          totalAmount: fromCents(totalAmountCents).toFixed(2),
          postingStatus: PurchaseInvoicePostingStatus.POSTED,
          printStatus: PurchaseInvoicePrintStatus.NOT_PRINTED,
          reviewStatus: PurchaseInvoiceReviewStatus.BELUM_DICEK,
          createdBy: user.sub,
        }),
      );

      const savedLines: PurchaseInvoiceLine[] = [];
      for (let i = 0; i < lineContexts.length; i++) {
        const ctx = lineContexts[i];
        const line = await manager.save(
          PurchaseInvoiceLine,
          manager.create(PurchaseInvoiceLine, {
            purchaseInvoiceId: invoice.id,
            lineOrder: i + 1,
            productId: ctx.product.id,
            unitId: ctx.unit.id,
            qtyInput: ctx.dto.qtyInput.toFixed(4),
            unitPrice: ctx.dto.isBonus
              ? '0.00'
              : (ctx.dto.unitPrice ?? 0).toFixed(2),
            // Diskon baris DI-DROP (K5) — kolom dipertahankan untuk faktur
            // lama, faktur baru selalu 0/null (ditolak DTO kalau != 0).
            discountPercent:
              ctx.dto.discountPercent != null
                ? ctx.dto.discountPercent.toFixed(2)
                : null,
            discountAmount: '0.00',
            qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
            // Alokasi diskon faktur per baris DI-DROP (K5) — diskon faktur
            // tidak lagi larut ke baris mana pun, jadi ini selalu 0.
            allocatedInvoiceDiscount: '0.00',
            // Tanpa alokasi, lineFinalAmount = baris[i] (gross) polos.
            lineFinalAmount: fromCents(grossCents[i]).toFixed(2),
            inputVat: fromCents(inputVatCents[i]).toFixed(2),
            unitCostResult: unitCostResults[i].toFixed(4),
            isBonus: !!ctx.dto.isBonus,
          }),
        );
        savedLines.push(line);
      }

      const goodsReceipt = await manager.save(
        GoodsReceipt,
        manager.create(GoodsReceipt, {
          purchaseInvoiceId: invoice.id,
          receiptDate: toDateOnlyString(receiptDate),
          supplierId: supplier.id,
          warehouseId: storeWarehouse.id,
          createdBy: user.sub,
        }),
      );

      const goodsReceiptLines: GoodsReceiptLine[] = [];
      for (let i = 0; i < lineContexts.length; i++) {
        const ctx = lineContexts[i];
        // SELALU ke STORE, tidak pernah langsung ke BAD_STOCK (CLAUDE.md §3
        // "Pembelian") — lotDate WAJIB receipt_date, bukan supplier_invoice_date.
        const movement = await this.stockRecorderService.recordIn(
          {
            productId: ctx.product.id,
            warehouseId: storeWarehouse.id,
            qtyBaseUnit: ctx.qtyBaseUnit,
            unitCost: unitCostResults[i],
            lotDate: receiptDate,
            movementDate: receiptDate,
            movementType: StockMovementType.PURCHASE,
            supplierId: supplier.id,
            sourceType: 'PURCHASE_INVOICE',
            sourceId: invoice.id,
            createdBy: user.sub,
          },
          manager,
        );

        const grLine = await manager.save(
          GoodsReceiptLine,
          manager.create(GoodsReceiptLine, {
            goodsReceiptId: goodsReceipt.id,
            purchaseInvoiceLineId: savedLines[i].id,
            productId: ctx.product.id,
            qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
            unitCost: unitCostResults[i].toFixed(4),
            stockMovementId: movement.id,
          }),
        );
        goodsReceiptLines.push(grLine);
      }

      // --- Jurnal: Persediaan (D) / [PPN Masukan (D)] / Hutang Usaha (K) /
      // [Diskon Pembelian (K)] (K5+K6, CLAUDE.md §4 "Faktur Pembelian") ----
      const inventoryAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_inventory_account = true',
          'Persediaan',
          manager,
        );
      const payableAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_payable_account = true',
          'Hutang Usaha',
          manager,
        );

      const inventoryCents = costBasisCents.reduce((sum, v) => sum + v, 0);
      const journalLines: PostJournalLineDto[] = [
        {
          accountId: inventoryAccountId,
          debit: fromCents(inventoryCents),
          credit: 0,
          description: `Persediaan dari faktur pembelian ${invoiceNumber}`,
        },
      ];

      if (companyIsPkp && inputVatTotalCents > 0) {
        // Cabang company_is_pkp=true (CLAUDE.md §4) — disiapkan, belum aktif
        // hari ini (settings.company_is_pkp masih false), tapi tetap
        // dilewati lewat jalur nyata (bukan dead code) kalau suatu saat
        // diaktifkan.
        const inputVatAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_input_vat_account = true',
            'PPN Masukan',
            manager,
          );
        journalLines.push({
          accountId: inputVatAccountId,
          debit: fromCents(inputVatTotalCents),
          credit: 0,
          description: `PPN Masukan faktur pembelian ${invoiceNumber}`,
        });
      }

      // Hutang Usaha = total_bayar (subtotal + Σ ppn_masukan − diskon_faktur)
      // — sama di kedua cabang company_is_pkp, karena diskon faktur tidak
      // pernah masuk harga pokok (K5).
      journalLines.push({
        accountId: payableAccountId,
        debit: 0,
        credit: fromCents(totalAmountCents),
        description: `Hutang usaha faktur pembelian ${invoiceNumber}`,
      });

      // Baris "Diskon Pembelian" HANYA saat diskon_faktur > 0 (pola sama
      // "Selisih Retur Pembelian" di PurchaseReturnsService: baris jurnal
      // ke-3 kondisional, bukan selalu ada).
      if (invoiceDiscountCents > 0) {
        const purchaseDiscountAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_purchase_discount_account = true',
            'Diskon Pembelian',
            manager,
          );
        journalLines.push({
          accountId: purchaseDiscountAccountId,
          debit: 0,
          credit: fromCents(invoiceDiscountCents),
          description: `Diskon faktur pembelian ${invoiceNumber}`,
        });
      }

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: receiptDate,
          description: `Faktur Pembelian ${invoiceNumber}`,
          sourceType: 'PURCHASE_INVOICE',
          sourceId: invoice.id,
          createdBy: user.sub,
          lines: journalLines,
        },
        manager,
      );

      return {
        purchaseInvoice: invoice,
        lines: savedLines,
        goodsReceipt,
        goodsReceiptLines,
        journalEntry,
      };
    });
  }

  async findAll(
    query: PurchaseInvoiceQueryDto,
  ): Promise<PaginatedResult<PurchaseInvoice>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'receiptDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.purchaseInvoicesRepository.createQueryBuilder('invoice');
    if (query.search) {
      // supplier_invoice_no boleh NULL sejak paket R7 (asumsi A3) — `NULL
      // ILIKE :search` evaluasi ke NULL (falsy), bukan error, dan OR di sini
      // tetap jatuh ke invoiceNumber. Baris ber-supplierInvoiceNo NULL tidak
      // pernah hilang dari hasil pencarian nomor internal.
      qb.andWhere(
        '(invoice.invoiceNumber ILIKE :search OR invoice.supplierInvoiceNo ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.supplierId) {
      qb.andWhere('invoice.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    if (query.reviewStatus) {
      qb.andWhere('invoice.reviewStatus = :reviewStatus', {
        reviewStatus: query.reviewStatus,
      });
    }
    if (query.date) {
      qb.andWhere('invoice.receiptDate = :date', { date: query.date });
    }

    qb.orderBy(`invoice.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<PurchaseInvoice> {
    const invoice = await this.purchaseInvoicesRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!invoice) {
      throw new BadRequestException('Faktur pembelian tidak ditemukan.');
    }
    return invoice;
  }

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). print_count
   * masuk audit_logs lewat @Audit('PRINT', ...) di controller, bukan di sini.
   */
  async registerPrint(id: string): Promise<PurchaseInvoice> {
    await this.printLockService.registerPrint({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
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
    dto: ReviewPurchaseInvoiceDto,
    user: AuthenticatedUser,
  ): Promise<PurchaseInvoice> {
    if (
      dto.reviewStatus === PurchaseInvoiceReviewStatus.BERMASALAH &&
      !dto.reviewNote?.trim()
    ) {
      throw new BadRequestException(
        'Catatan wajib diisi saat menandai faktur BERMASALAH.',
      );
    }
    await this.purchaseInvoicesRepository.update(id, {
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
      reviewedBy: user.sub,
      reviewedAt: new Date(),
    });
    return this.findOne(id);
  }

  /**
   * Edit BERSYARAT — scope sengaja sempit (dikonfirmasi user Hari 15): hanya
   * field header yang TIDAK menyentuh stok/jurnal. qty/harga/diskon/baris
   * TETAP tidak bisa diedit; koreksinya lewat VOID + faktur B1 baru.
   * Digerbangi kunci cetak (PrintLockService) DAN lot-belum-terkonsumsi
   * (StockRecorderService.assertLotsUnconsumed) — dua-duanya independen dari
   * scope sempit field yang diedit, sesuai kontrak DoD hari ini yang
   * menguji perilaku gerbang, bukan isi edit.
   */
  async update(
    id: string,
    dto: UpdatePurchaseInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<PurchaseInvoice> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === PurchaseInvoicePostingStatus.VOIDED) {
      throw new BadRequestException(
        'Faktur ini sudah VOID, tidak bisa diedit.',
      );
    }

    // WAJIB tanpa manager — kalau dokumen sudah PRINTED dan belum ada
    // authorizationRequestId, baris authorization_requests baru yang
    // dibuat di sini TIDAK BOLEH ikut rollback transaction di bawah (pola
    // sama WarehouseMutationsService.create() untuk BS_TO_STORE).
    await this.printLockService.preflight({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
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
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });

      await this.stockRecorderService.assertLotsUnconsumed(
        'PURCHASE_INVOICE',
        id,
        manager,
        'Barang dari faktur ini sudah bergerak (terjual/dipindah) — tidak bisa diedit. Batalkan (VOID) dan buat faktur baru.',
      );

      const supplierInvoiceDate = dto.supplierInvoiceDate
        ? parseDateOnly(dto.supplierInvoiceDate)
        : parseDateOnly(existing.supplierInvoiceDate);
      const termDays = dto.termDays ?? existing.termDays;
      const dueDate = addDays(supplierInvoiceDate, termDays);

      await manager.update(PurchaseInvoice, id, {
        supplierInvoiceNo: dto.supplierInvoiceNo ?? existing.supplierInvoiceNo,
        supplierInvoiceDate: toDateOnlyString(supplierInvoiceDate),
        termDays,
        dueDate: toDateOnlyString(dueDate),
      });

      const updated = await manager.findOne(PurchaseInvoice, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Faktur pembelian tidak ditemukan.');
      }
      return updated;
    });
  }

  /**
   * VOID lewat VoidEngineService (Hari 11) + PurchaseInvoiceVoidHook —
   * digerbangi DUA gerbang independen, pola PERSIS
   * SalesInvoicesService.voidInvoice():
   *   - kunci cetak UNLOCK_PRINT intent VOID (§2.16, semua role, hanya kalau
   *     sudah PRINTED) lewat `authorizationRequestId`;
   *   - VOID_DOCUMENT (§2.13, hanya OPERATOR, tidak peduli status cetak)
   *     lewat `voidAuthorizationRequestId`.
   * Gerbang kedua dulu ditunda menunggu payload matcher VOID_DOCUMENT
   * (Hari 21) lalu terlupa — ditambahkan 6 Okt 2026 (need_fixing.md #13).
   */
  async voidInvoice(
    id: string,
    dto: VoidPurchaseInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    voidAuthorizationRequestId?: string,
  ): Promise<PurchaseInvoice> {
    const existing = await this.findOne(id);
    const unlockReason = dto.unlockReason ?? dto.reasonNote;

    await this.printLockService.preflight({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
      documentLabel: existing.invoiceNumber,
      intent: 'VOID',
      reason: unlockReason,
      user,
      authorizationRequestId,
    });

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'PURCHASE_INVOICE', sourceId: id };
    const voidContextSummary = `VOID faktur pembelian ${existing.invoiceNumber}: ${dto.reasonNote}`;

    if (needsVoidApproval && !voidAuthorizationRequestId) {
      // WAJIB tanpa manager — baris authorization_requests baru tidak boleh
      // ikut rollback (sama alasannya dengan preflight() di atas).
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.VOID_DOCUMENT,
        payload: voidPayload,
        contextSummary: voidContextSummary,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'VOID',
        reason: unlockReason,
        user,
        authorizationRequestId,
        manager,
      });

      if (needsVoidApproval) {
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
        sourceType: 'PURCHASE_INVOICE',
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
   * K1-K4, §3) — nomor faktur TETAP, jurnal+lot lama dibalik lalu diposting
   * ulang di dalam SATU transaction, bertanggal receiptDate LAMA (K2). Layar
   * edit PENUH: RevisePurchaseInvoiceDto mewarisi SELURUH validasi
   * CreatePurchaseInvoiceDto, rumus (calculatePurchaseInvoice) PERSIS SAMA
   * dengan create().
   *
   * Gerbang tambahan (beforeReverse): assertLotsUnconsumed — barang dari
   * faktur ini yang SUDAH TERJUAL SEBAGIAN tidak boleh direvisi (persis
   * gerbang PurchaseInvoiceVoidHook.checkVoidable, K1 mewarisi batas yang
   * sama). Tidak ada gerbang SELL_BELOW_COST — itu HANYA berlaku faktur
   * PENJUALAN (§2.17), tidak pernah pembelian.
   */
  async reviseInvoice(
    id: string,
    dto: RevisePurchaseInvoiceDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<PurchaseInvoice> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === PurchaseInvoicePostingStatus.VOIDED) {
      throw new BadRequestException(
        'Faktur ini sudah VOID, tidak bisa direvisi.',
      );
    }
    this.assertPurchaseDiscountShape(dto);

    // WAJIB tanpa manager — sama alasannya dengan update()/voidInvoice() di
    // atas (baris authorization_requests baru tidak boleh ikut rollback).
    await this.printLockService.preflight({
      table: 'purchase_invoices',
      sourceType: 'PURCHASE_INVOICE',
      documentId: id,
      documentLabel: existing.invoiceNumber,
      intent: 'EDIT',
      reason: dto.reason,
      user,
      authorizationRequestId,
    });

    return this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'purchase_invoices',
        sourceType: 'PURCHASE_INVOICE',
        documentId: id,
        documentLabel: existing.invoiceNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });

      // PrintLockService.consume() SUDAH menaikkan revision_number di atas
      // KALAU faktur ini PRINTED (K4) — jangan naikkan dua kali.
      const wasPrinted =
        existing.printStatus === PurchaseInvoicePrintStatus.PRINTED;

      const supplier = await manager.findOne(Supplier, {
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException(
          `Supplier ${dto.supplierId} tidak ditemukan.`,
        );
      }

      const companyIsPkp = await this.getCompanyIsPkp(manager);
      const storeWarehouse = await this.resolveStoreWarehouse(manager);

      const receiptDate = parseDateOnly(dto.receiptDate);
      const supplierInvoiceDate = parseDateOnly(dto.supplierInvoiceDate);
      const dueDate = addDays(supplierInvoiceDate, dto.termDays);

      const {
        lineContexts,
        grossCents,
        subtotalCents,
        invoiceDiscountCents,
        inputVatCents,
        inputVatTotalCents,
        costBasisCents,
        unitCostResults,
        totalAmountCents,
      } = await this.calculatePurchaseInvoice(
        dto,
        supplier,
        supplierInvoiceDate,
        companyIsPkp,
        manager,
      );

      await this.documentReviseService.revise({
        sourceType: 'PURCHASE_INVOICE',
        sourceId: id,
        originalDate: parseDateOnly(existing.receiptDate),
        userId: user.sub,
        manager,
        reversalDescription: `Pembalik revisi faktur pembelian ${existing.invoiceNumber}`,
        beforeReverse: (manager) =>
          this.stockRecorderService.assertLotsUnconsumed(
            'PURCHASE_INVOICE',
            id,
            manager,
            'Barang dari faktur ini sudah terjual sebagian — tidak bisa direvisi. Gunakan Retur Pembelian.',
          ),
        applyChanges: async (manager): Promise<ApplyChangesResult> => {
          await manager.update(PurchaseInvoice, id, {
            supplierId: supplier.id,
            supplierInvoiceNo: dto.supplierInvoiceNo ?? null,
            receiptDate: toDateOnlyString(receiptDate),
            supplierInvoiceDate: toDateOnlyString(supplierInvoiceDate),
            dueDate: toDateOnlyString(dueDate),
            termDays: dto.termDays,
            subtotal: fromCents(subtotalCents).toFixed(2),
            lineDiscountTotal: '0.00',
            invoiceDiscountAmount: fromCents(invoiceDiscountCents).toFixed(2),
            invoiceDiscountPercent:
              dto.invoiceDiscountPercent != null
                ? dto.invoiceDiscountPercent.toFixed(2)
                : null,
            inputVatAmount: fromCents(inputVatTotalCents).toFixed(2),
            totalAmount: fromCents(totalAmountCents).toFixed(2),
          });

          const goodsReceipt = await manager.findOneOrFail(GoodsReceipt, {
            where: { purchaseInvoiceId: id },
          });
          await manager.update(GoodsReceipt, goodsReceipt.id, {
            receiptDate: toDateOnlyString(receiptDate),
            supplierId: supplier.id,
            warehouseId: storeWarehouse.id,
          });

          // Urutan hapus WAJIB: goods_receipt_lines (ANAK, FK ke
          // purchase_invoice_lines — migration CreatePurchaseInvoices.ts:122)
          // dulu, baru purchase_invoice_lines (INDUK). goods_receipt_lines
          // TIDAK dirujuk dokumen LUAR mana pun (beda dari
          // sales_invoice_lines yang dirujuk delivery_order_lines/
          // sales_return_lines) — aman dihapus+ditulis ulang bersama
          // purchase_invoice_lines dalam SATU event revisi ini.
          // purchase_return_lines TIDAK menunjuk purchase_invoice_lines sama
          // sekali (CLAUDE.md §3 "retur pembelian ... tidak menunjuk faktur
          // pembelian asal") — tidak perlu gerbang tambahan seperti sisi
          // penjualan.
          await manager.delete(GoodsReceiptLine, {
            goodsReceiptId: goodsReceipt.id,
          });
          await manager.delete(PurchaseInvoiceLine, {
            purchaseInvoiceId: id,
          });

          const savedLines: PurchaseInvoiceLine[] = [];
          for (let i = 0; i < lineContexts.length; i++) {
            const ctx = lineContexts[i];
            const line = await manager.save(
              PurchaseInvoiceLine,
              manager.create(PurchaseInvoiceLine, {
                purchaseInvoiceId: id,
                lineOrder: i + 1,
                productId: ctx.product.id,
                unitId: ctx.unit.id,
                qtyInput: ctx.dto.qtyInput.toFixed(4),
                unitPrice: ctx.dto.isBonus
                  ? '0.00'
                  : (ctx.dto.unitPrice ?? 0).toFixed(2),
                discountPercent:
                  ctx.dto.discountPercent != null
                    ? ctx.dto.discountPercent.toFixed(2)
                    : null,
                discountAmount: '0.00',
                qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
                allocatedInvoiceDiscount: '0.00',
                lineFinalAmount: fromCents(grossCents[i]).toFixed(2),
                inputVat: fromCents(inputVatCents[i]).toFixed(2),
                unitCostResult: unitCostResults[i].toFixed(4),
                isBonus: !!ctx.dto.isBonus,
              }),
            );
            savedLines.push(line);
          }

          for (let i = 0; i < lineContexts.length; i++) {
            const ctx = lineContexts[i];
            // SELALU ke STORE, lotDate WAJIB receiptDate (CLAUDE.md §3) —
            // rumus PERSIS create().
            const movement = await this.stockRecorderService.recordIn(
              {
                productId: ctx.product.id,
                warehouseId: storeWarehouse.id,
                qtyBaseUnit: ctx.qtyBaseUnit,
                unitCost: unitCostResults[i],
                lotDate: receiptDate,
                movementDate: receiptDate,
                movementType: StockMovementType.PURCHASE,
                supplierId: supplier.id,
                sourceType: 'PURCHASE_INVOICE',
                sourceId: id,
                createdBy: user.sub,
              },
              manager,
            );

            await manager.save(
              GoodsReceiptLine,
              manager.create(GoodsReceiptLine, {
                goodsReceiptId: goodsReceipt.id,
                purchaseInvoiceLineId: savedLines[i].id,
                productId: ctx.product.id,
                qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
                unitCost: unitCostResults[i].toFixed(4),
                stockMovementId: movement.id,
              }),
            );
          }

          // --- Jurnal (CLAUDE.md §4 "Faktur Pembelian", K5+K6) — rumus
          // PERSIS create() -------------------------------------------------
          const inventoryAccountId =
            await this.accountResolverService.resolveSingleActive(
              'is_inventory_account = true',
              'Persediaan',
              manager,
            );
          const payableAccountId =
            await this.accountResolverService.resolveSingleActive(
              'is_payable_account = true',
              'Hutang Usaha',
              manager,
            );

          const inventoryCents = costBasisCents.reduce((sum, v) => sum + v, 0);
          const journalLines: PostJournalLineDto[] = [
            {
              accountId: inventoryAccountId,
              debit: fromCents(inventoryCents),
              credit: 0,
              description: `Persediaan dari faktur pembelian ${existing.invoiceNumber} (revisi)`,
            },
          ];

          if (companyIsPkp && inputVatTotalCents > 0) {
            const inputVatAccountId =
              await this.accountResolverService.resolveSingleActive(
                'is_input_vat_account = true',
                'PPN Masukan',
                manager,
              );
            journalLines.push({
              accountId: inputVatAccountId,
              debit: fromCents(inputVatTotalCents),
              credit: 0,
              description: `PPN Masukan faktur pembelian ${existing.invoiceNumber} (revisi)`,
            });
          }

          journalLines.push({
            accountId: payableAccountId,
            debit: 0,
            credit: fromCents(totalAmountCents),
            description: `Hutang usaha faktur pembelian ${existing.invoiceNumber} (revisi)`,
          });

          if (invoiceDiscountCents > 0) {
            const purchaseDiscountAccountId =
              await this.accountResolverService.resolveSingleActive(
                'is_purchase_discount_account = true',
                'Diskon Pembelian',
                manager,
              );
            journalLines.push({
              accountId: purchaseDiscountAccountId,
              debit: 0,
              credit: fromCents(invoiceDiscountCents),
              description: `Diskon faktur pembelian ${existing.invoiceNumber} (revisi)`,
            });
          }

          return {
            repostDate: receiptDate,
            journalDescription: `Faktur Pembelian ${existing.invoiceNumber} (revisi)`,
            journalLines,
          };
        },
      });

      if (!wasPrinted) {
        await manager.increment(PurchaseInvoice, { id }, 'revisionNumber', 1);
      }

      const updated = await manager.findOne(PurchaseInvoice, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Faktur pembelian tidak ditemukan.');
      }
      return updated;
    });
  }

  // --- Helper --------------------------------------------------------------

  private async resolveLineContexts(
    lines: CreatePurchaseInvoiceLineDto[],
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

  // Base unit produk implisit faktor 1 (tidak punya baris di
  // product_unit_conversions — lihat validateUnitConversions di modul
  // Products). Pencocokan lewat NAMA (case/whitespace-insensitive), bukan FK
  // — celah yang sudah diketahui sejak Hari 8 (units belum di-FK ke
  // product_unit_conversions.unit_name), tidak diperbaiki di sini. Gagal
  // eksplisit kalau tidak ketemu, tidak pernah diam-diam jatuh ke faktor 1.
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
   * Rumus §4 CLAUDE.md "Faktur Pembelian" (K5+K6) — diekstrak dari create()
   * (paket R6) supaya reviseInvoice() memakai rumus PERSIS SAMA, bukan
   * salinan yang bisa hanyut beda seiring waktu.
   */
  private async calculatePurchaseInvoice(
    dto: Pick<CreatePurchaseInvoiceDto, 'invoiceDiscountAmount' | 'lines'>,
    supplier: Supplier,
    supplierInvoiceDate: Date,
    companyIsPkp: boolean,
    manager: EntityManager,
  ): Promise<PurchaseInvoiceCalculation> {
    const lineContexts = await this.resolveLineContexts(dto.lines, manager);

    // --- Langkah 1: baris[i] -> subtotal (sen integer). K5: TIDAK ADA
    // diskon baris lagi.
    const grossCents: number[] = [];
    let subtotalCents = 0;

    lineContexts.forEach((ctx) => {
      if (ctx.dto.isBonus) {
        grossCents.push(0);
        return;
      }
      const unitPrice = ctx.dto.unitPrice ?? 0;
      if (unitPrice <= 0) {
        throw new BadRequestException(
          `Baris produk ${ctx.product.displayName}: unitPrice wajib > 0 untuk baris non-bonus.`,
        );
      }
      const grossC = toCents(ctx.dto.qtyInput * unitPrice);
      grossCents.push(grossC);
      subtotalCents += grossC;
    });

    // Diskon faktur RUPIAH SAJA (K5) — TIDAK dialokasikan ke baris dan TIDAK
    // menyentuh harga pokok.
    const invoiceDiscountCents = toCents(dto.invoiceDiscountAmount ?? 0);
    if (invoiceDiscountCents > subtotalCents) {
      throw new BadRequestException(
        'Diskon faktur tidak boleh melebihi subtotal.',
      );
    }

    // --- Langkah 2: PPN masukan (gerbang supplier.is_pkp x product.is_bkp).
    let resolvedTaxRate: number | null = null;
    const inputVatCents: number[] = [];
    for (let i = 0; i < lineContexts.length; i++) {
      const ctx = lineContexts[i];
      const gatedOff = ctx.dto.isBonus || !supplier.isPkp || !ctx.product.isBkp;
      if (gatedOff) {
        inputVatCents.push(0);
        continue;
      }
      if (resolvedTaxRate === null) {
        resolvedTaxRate = await this.taxRateResolverService.getEffectiveRate(
          supplierInvoiceDate,
          manager,
        );
      }
      inputVatCents.push(Math.round((grossCents[i] * resolvedTaxRate) / 100));
    }

    // --- Langkah 3: harga_pokok (kapitalisasi PPN masukan kalau non-PKP).
    const costBasisCents = grossCents.map((grossC, i) =>
      companyIsPkp ? grossC : grossC + inputVatCents[i],
    );

    // --- Langkah 4: unit_cost per satuan dasar — EKSAK, tanpa alokasi.
    const unitCostResults = lineContexts.map((ctx, i) =>
      ctx.dto.isBonus ? 0 : fromCents(costBasisCents[i]) / ctx.qtyBaseUnit,
    );

    const inputVatTotalCents = inputVatCents.reduce((sum, v) => sum + v, 0);
    // total_bayar = subtotal + Σ ppn_masukan - diskon_faktur
    const totalAmountCents =
      subtotalCents + inputVatTotalCents - invoiceDiscountCents;

    return {
      lineContexts,
      grossCents,
      subtotalCents,
      invoiceDiscountCents,
      inputVatCents,
      inputVatTotalCents,
      costBasisCents,
      unitCostResults,
      totalAmountCents,
    };
  }

  // Faktur pembelian selalu masuk STORE, tidak pernah langsung ke BAD_STOCK
  // (CLAUDE.md §3 "Pembelian") — pola resolve sama
  // WarehouseMutationsService.resolveFromWarehouse().
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
        'Gudang STORE aktif tidak ditemukan — periksa data gudang sebelum membuat faktur pembelian.',
      );
    }
    return anyStore;
  }

  // Diskon baris & diskon faktur persen DI-DROP (K5, docs/RENCANA_REVISI_TESTING_KLIEN.md
  // §2A paket R7) — DTO sudah menolaknya lewat @Equals(0), dicek ulang di
  // sini untuk pemanggil service langsung (pola sama
  // SalesInvoicesService.assertSalesDiscountDropped()).
  private assertPurchaseDiscountShape(dto: CreatePurchaseInvoiceDto): void {
    const droppedValues = [
      dto.invoiceDiscountPercent,
      ...dto.lines.flatMap((line) => [
        line.discountPercent,
        line.discountAmount,
      ]),
    ];
    if (droppedValues.some((value) => value != null && value !== 0)) {
      throw new BadRequestException(
        'Diskon baris pembelian dan diskon faktur persen sudah tidak dipakai — isi diskon di tingkat faktur dalam rupiah (CLAUDE.md §4).',
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
