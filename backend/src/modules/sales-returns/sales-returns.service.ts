import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import {
  ApplyChangesResult,
  DocumentReviseService,
} from '../../core/document-revise/document-revise.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import { Role } from '../../common/enums/role.enum';
import { ActionType } from '../authorization-requests/action-type.enum';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { ReviseSalesReturnDto } from './dto/revise-sales-return.dto';
import { VoidSalesReturnDto } from './dto/void-sales-return.dto';
import { SalesReturnQueryDto } from './dto/sales-return-query.dto';
import { SalesReturnLine } from './entities/sales-return-line.entity';
import {
  SalesReturn,
  SalesReturnPostingStatus,
  SalesReturnPrintStatus,
  SalesReturnSettlementType,
} from './entities/sales-return.entity';

const SORTABLE_COLUMNS = ['returnNumber', 'returnDate', 'createdAt'] as const;
const QTY_EPSILON = 1e-6;

export interface CreateSalesReturnResult {
  salesReturn: SalesReturn;
  lines: SalesReturnLine[];
  journalEntry: JournalEntry | null;
}

/**
 * Retur Penjualan (CLAUDE.md §3 "Lain-lain" + §4 "Retur Penjualan", Hari 23)
 * — BEDA dari Retur Pembelian (Hari 16): WAJIB menunjuk faktur asal
 * (sales_invoice_id + per-baris sales_invoice_line_id), harga pokok WAJIB
 * unit_cost_fifo faktur asal (TIDAK dinegosiasikan, TIDAK ada akun
 * "Selisih"). Barang SELALU masuk BAD_STOCK lewat
 * StockRecorderService.recordIn() (bukan transfer() — ini lot BARU dengan
 * unit_cost yang DITENTUKAN pemanggil, bukan lot yang dipindah).
 *
 * PPN Keluaran & diskon faktur hanya ada di level HEADER faktur asli (tidak
 * per baris) — retur parsial memprorata keduanya lewat TARIF EFEKTIF faktur
 * asli sendiri (bukan tax_rates hari ini, keputusan user eksplisit sebelum
 * modul ini ditulis). Properti yang bisa diandalkan: retur SELURUH baris
 * pada qty penuh mereproduksi total_amount faktur asal PERSIS.
 *
 * `sales_returns.total_amount` juga dipakai sebagai pengganti sementara
 * `paid_amount` (belum ada, Payment module Hari 26-27) untuk validasi
 * "retur tidak boleh melebihi total faktur asal" — keputusan user eksplisit,
 * lihat createSalesReturnCumulativeCap di bawah.
 *
 * TIDAK memanggil PeriodLockValidatorService secara eksplisit — pola sama
 * PurchaseReturnsService/PurchaseInvoicesService: backdate sudah divalidasi
 * lewat JournalPosterService.post().
 *
 * VOID (voidReturn) & revisi-di-tempat (reviseReturn) ditambahkan
 * need_fixing.md #19 (6 Okt 2026) — pola PERSIS Faktur Penjualan:
 * VOID = UNLOCK_PRINT (kalau PRINTED) + VOID_DOCUMENT (OPERATOR), jurnal
 * pembalik bertanggal hari ini (VoidEngineService); revisi = nomor tetap,
 * revision_number++, dibalik & diposting ulang bertanggal dokumen
 * (DocumentReviseService, §2.16a).
 */
@Injectable()
export class SalesReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(SalesReturn)
    private readonly salesReturnsRepository: Repository<SalesReturn>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly arAccountResolverService: ArAccountResolverService,
    private readonly printLockService: PrintLockService,
    private readonly voidEngineService: VoidEngineService,
    private readonly stepUpService: StepUpService,
    private readonly documentReviseService: DocumentReviseService,
  ) {}

  async create(
    dto: CreateSalesReturnDto,
    user: AuthenticatedUser,
  ): Promise<CreateSalesReturnResult> {
    this.validateSettlement(dto);
    const returnDate = parseDateOnly(dto.returnDate);

    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOne(SalesInvoice, {
        where: { id: dto.salesInvoiceId },
        relations: { lines: true },
      });
      if (!invoice) {
        throw new BadRequestException('Faktur penjualan tidak ditemukan.');
      }
      if (invoice.postingStatus === SalesInvoicePostingStatus.VOIDED) {
        throw new BadRequestException(
          'Faktur penjualan sudah dibatalkan (VOID), tidak bisa diretur.',
        );
      }

      const customer = await manager.findOne(Customer, {
        where: { id: invoice.customerId },
      });
      if (!customer) {
        throw new BadRequestException(
          `Pelanggan ${invoice.customerId} tidak ditemukan.`,
        );
      }

      const badStockWarehouse = await this.resolveBadStockWarehouse(manager);

      if (dto.settlementType === SalesReturnSettlementType.CASH) {
        await this.accountResolverService.assertAccountHasFlag(
          dto.cashAccountId!,
          'is_cash_account',
          'Kas/Bank',
          manager,
        );
      }

      const returnNumber = await this.documentCounterService.getNextNumber(
        'SALES_RETURN',
        returnDate,
        manager,
      );

      const salesReturn = await manager.save(
        SalesReturn,
        manager.create(SalesReturn, {
          returnNumber,
          salesInvoiceId: invoice.id,
          customerId: customer.id,
          returnDate: toDateOnlyString(returnDate),
          settlementType: dto.settlementType,
          cashAccountId: dto.cashAccountId ?? null,
          dppAmount: '0.00',
          outputVatAmount: '0.00',
          totalAmount: '0.00',
          costBasisAmount: '0.00',
          postingStatus: SalesReturnPostingStatus.POSTED,
          printStatus: SalesReturnPrintStatus.NOT_PRINTED,
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );

      const { savedLines, journalLines } = await this.postLinesAndBuildJournal({
        salesReturnId: salesReturn.id,
        returnNumber,
        returnDate,
        invoice,
        customer,
        dto,
        badStockWarehouseId: badStockWarehouse.id,
        userId: user.sub,
        manager,
      });

      // Retur seluruhnya bernilai nol (mis. semua baris bonus, unit_cost_fifo
      // dan unit_price sama-sama 0) — stok tetap berpindah lewat recordIn() di
      // atas, tapi tidak ada apa pun untuk dijurnal. Tidak memanggil
      // JournalPosterService sama sekali (yang mensyaratkan minimal 2 baris
      // bernilai) — sama seperti baris bonus di faktur tidak pernah
      // menghasilkan COGS.
      let journalEntry: JournalEntry | null = null;
      if (journalLines.length > 0) {
        journalEntry = await this.journalPosterService.post(
          {
            entryDate: returnDate,
            description: `Retur Penjualan ${returnNumber}`,
            sourceType: 'SALES_RETURN',
            sourceId: salesReturn.id,
            createdBy: user.sub,
            lines: journalLines,
          },
          manager,
        );
      }

      const finalReturn = await manager.findOne(SalesReturn, {
        where: { id: salesReturn.id },
      });

      return {
        salesReturn: finalReturn!,
        lines: savedLines,
        journalEntry,
      };
    });
  }

  /**
   * Inti posting retur penjualan — dipakai create() DAN reviseReturn()
   * (need_fixing.md #19, paket revisi-di-tempat §2.16a). Menulis baris +
   * stok (BAD_STOCK, unit_cost_fifo faktur asal), memvalidasi kumulatif,
   * memperbarui total header, dan MENGEMBALIKAN baris jurnal (bukan
   * memposting) supaya jalur revisi bisa menyerahkan posting ke
   * DocumentReviseService.
   */
  private async postLinesAndBuildJournal(params: {
    salesReturnId: string;
    returnNumber: string;
    returnDate: Date;
    invoice: SalesInvoice;
    customer: Customer;
    dto: CreateSalesReturnDto;
    badStockWarehouseId: string;
    userId: string;
    manager: EntityManager;
  }): Promise<{
    savedLines: SalesReturnLine[];
    journalLines: PostJournalLineDto[];
  }> {
    const {
      salesReturnId,
      returnNumber,
      returnDate,
      invoice,
      customer,
      dto,
      badStockWarehouseId,
      userId,
      manager,
    } = params;
    const savedLines: SalesReturnLine[] = [];
    let totalDppRawCents = 0;
    let totalCostCents = 0;
    const seenQtyBaseUnitByLine = new Map<string, number>();

    for (let i = 0; i < dto.lines.length; i++) {
      const lineDto = dto.lines[i];
      const originalLine = invoice.lines.find(
        (l) => l.id === lineDto.salesInvoiceLineId,
      );
      if (!originalLine) {
        throw new BadRequestException(
          `Baris faktur ${lineDto.salesInvoiceLineId} tidak ditemukan pada faktur ini.`,
        );
      }

      const ratio = lineDto.qtyInput / Number(originalLine.qtyInput);
      const qtyBaseUnitReturn = roundTo(
        ratio * Number(originalLine.qtyBaseUnit),
        4,
      );

      const alreadyReturned = await this.getAlreadyReturnedQtyBaseUnit(
        originalLine.id,
        manager,
      );
      const seenThisRequest = seenQtyBaseUnitByLine.get(originalLine.id) ?? 0;
      if (
        qtyBaseUnitReturn + alreadyReturned + seenThisRequest >
        Number(originalLine.qtyBaseUnit) + QTY_EPSILON
      ) {
        throw new BadRequestException(
          `Qty retur melebihi sisa qty faktur untuk baris ${originalLine.id}.`,
        );
      }
      seenQtyBaseUnitByLine.set(
        originalLine.id,
        seenThisRequest + qtyBaseUnitReturn,
      );

      const lineDppCents = Math.round(
        ratio * toCents(Number(originalLine.netAmount)),
      );
      const unitCostFifo = Number(originalLine.unitCostFifo);
      const lineCostCents = Math.round(qtyBaseUnitReturn * unitCostFifo * 100);
      totalDppRawCents += lineDppCents;
      totalCostCents += lineCostCents;

      // Barang retur pelanggan SELALU masuk BAD_STOCK (CLAUDE.md §3 "Bad
      // stock"), pada unit_cost = unit_cost_fifo faktur asal — TIDAK PERNAH
      // dihitung ulang.
      const movement = await this.stockRecorderService.recordIn(
        {
          productId: originalLine.productId,
          warehouseId: badStockWarehouseId,
          qtyBaseUnit: qtyBaseUnitReturn,
          unitCost: unitCostFifo,
          lotDate: returnDate,
          movementDate: returnDate,
          movementType: StockMovementType.RETURN_IN,
          supplierId: null,
          sourceType: 'SALES_RETURN',
          sourceId: salesReturnId,
          createdBy: userId,
        },
        manager,
      );

      const line = await manager.save(
        SalesReturnLine,
        manager.create(SalesReturnLine, {
          salesReturnId: salesReturnId,
          lineOrder: i + 1,
          salesInvoiceLineId: originalLine.id,
          productId: originalLine.productId,
          qtyInput: lineDto.qtyInput.toFixed(4),
          qtyBaseUnit: qtyBaseUnitReturn.toFixed(4),
          unitCostFifo: unitCostFifo.toFixed(4),
          dppAmount: fromCents(lineDppCents).toFixed(2),
          costAmount: fromCents(lineCostCents).toFixed(2),
          stockMovementId: movement.id,
        }),
      );
      savedLines.push(line);
    }

    // --- Prorata PPN Keluaran & diskon faktur dari angka ASLI faktur -----
    const invoiceSubtotalCents = toCents(Number(invoice.subtotal));
    const invoiceDiscountCents = toCents(Number(invoice.invoiceDiscountAmount));
    const invoiceDiscountRatio =
      invoiceSubtotalCents > 0
        ? invoiceDiscountCents / invoiceSubtotalCents
        : 0;
    const totalDppCents = Math.round(
      totalDppRawCents * (1 - invoiceDiscountRatio),
    );

    const invoiceTaxableBaseCents = invoiceSubtotalCents - invoiceDiscountCents;
    const effectiveVatRate =
      invoiceTaxableBaseCents > 0
        ? toCents(Number(invoice.outputVatAmount)) / invoiceTaxableBaseCents
        : 0;
    const outputVatCents = Math.round(totalDppCents * effectiveVatRate);

    const totalAmountCents = totalDppCents + outputVatCents;

    // --- Validasi kumulatif: retur tidak boleh melebihi total faktur asal
    // (pengganti sementara paid_amount, belum ada Payment module — CLAUDE.md
    // §0, keputusan user eksplisit) ------------------------------------
    const alreadyReturnedTotalCents = await this.getAlreadyReturnedTotalCents(
      invoice.id,
      salesReturnId,
      manager,
    );
    const invoiceTotalCents = toCents(Number(invoice.totalAmount));
    if (
      alreadyReturnedTotalCents + totalAmountCents >
      invoiceTotalCents + 1 // toleransi 1 sen pembulatan
    ) {
      throw new BadRequestException('Total retur melebihi total faktur asal.');
    }

    await manager.update(SalesReturn, salesReturnId, {
      dppAmount: fromCents(totalDppCents).toFixed(2),
      outputVatAmount: fromCents(outputVatCents).toFixed(2),
      totalAmount: fromCents(totalAmountCents).toFixed(2),
      costBasisAmount: fromCents(totalCostCents).toFixed(2),
    });

    // --- Jurnal (CLAUDE.md §4 "Retur Penjualan") --------------------------
    // Retur Penjualan (D) DPP / PPN Keluaran (D) bila ada
    //     Piutang/Kas (K) total
    // Persediaan (D) HPP asli / HPP (K) HPP asli
    const journalLines: PostJournalLineDto[] = [];

    if (totalDppCents > 0) {
      const salesReturnAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_sales_return_account = true',
          'Retur Penjualan',
          manager,
        );
      journalLines.push({
        accountId: salesReturnAccountId,
        debit: fromCents(totalDppCents),
        credit: 0,
        description: `Retur Penjualan ${returnNumber}`,
      });
    }

    if (outputVatCents > 0) {
      const outputVatAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_output_vat_account = true',
          'PPN Keluaran',
          manager,
        );
      journalLines.push({
        accountId: outputVatAccountId,
        debit: fromCents(outputVatCents),
        credit: 0,
        description: `PPN Keluaran retur ${returnNumber}`,
      });
    }

    if (totalAmountCents > 0) {
      const creditAccountId =
        dto.settlementType === SalesReturnSettlementType.CASH
          ? dto.cashAccountId!
          : await this.arAccountResolverService.resolve(customer, manager);
      journalLines.push({
        accountId: creditAccountId,
        debit: 0,
        credit: fromCents(totalAmountCents),
        description: `Retur Penjualan ${returnNumber}`,
        customerId:
          dto.settlementType === SalesReturnSettlementType.REDUCE_INVOICE
            ? customer.id
            : undefined,
      });
    }

    if (totalCostCents > 0) {
      const inventoryAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_inventory_account = true',
          'Persediaan',
          manager,
        );
      const cogsAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_cogs_account = true',
          'Harga Pokok Penjualan',
          manager,
        );
      journalLines.push({
        accountId: inventoryAccountId,
        debit: fromCents(totalCostCents),
        credit: 0,
        description: `Persediaan dari retur penjualan ${returnNumber}`,
      });
      journalLines.push({
        accountId: cogsAccountId,
        debit: 0,
        credit: fromCents(totalCostCents),
        description: `HPP retur penjualan ${returnNumber}`,
      });
    }

    return { savedLines, journalLines };
  }

  async findAll(
    query: SalesReturnQueryDto,
  ): Promise<PaginatedResult<SalesReturn>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'returnDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.salesReturnsRepository.createQueryBuilder('ret');
    if (query.search) {
      qb.andWhere('ret.returnNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.salesInvoiceId) {
      qb.andWhere('ret.salesInvoiceId = :salesInvoiceId', {
        salesInvoiceId: query.salesInvoiceId,
      });
    }

    qb.orderBy(`ret.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<SalesReturn> {
    const salesReturn = await this.salesReturnsRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!salesReturn) {
      throw new BadRequestException('Retur penjualan tidak ditemukan.');
    }
    return salesReturn;
  }

  /**
   * VOID Retur Penjualan (need_fixing.md #19) — dua gerbang independen,
   * persis SalesInvoicesService.voidInvoice(): UNLOCK_PRINT intent VOID
   * (x-authorization-request-id, kalau PRINTED) + VOID_DOCUMENT
   * (x-void-authorization-request-id, OPERATOR). Jurnal & stok BS dibalik
   * bertanggal hari ini; SalesReturnVoidHook menolak kalau barang BS dari
   * retur ini sudah terpakai.
   */
  async voidReturn(
    id: string,
    dto: VoidSalesReturnDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    voidAuthorizationRequestId?: string,
  ): Promise<SalesReturn> {
    const existing = await this.findOne(id);
    const unlockReason = dto.unlockReason ?? dto.reasonNote;

    await this.printLockService.preflight({
      table: 'sales_returns',
      sourceType: 'SALES_RETURN',
      documentId: id,
      documentLabel: existing.returnNumber,
      intent: 'VOID',
      reason: unlockReason,
      user,
      authorizationRequestId,
    });

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'SALES_RETURN', sourceId: id };
    const voidContextSummary = `VOID retur penjualan ${existing.returnNumber}: ${dto.reasonNote}`;
    if (needsVoidApproval && !voidAuthorizationRequestId) {
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.VOID_DOCUMENT,
        payload: voidPayload,
        contextSummary: voidContextSummary,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'sales_returns',
        sourceType: 'SALES_RETURN',
        documentId: id,
        documentLabel: existing.returnNumber,
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
        sourceType: 'SALES_RETURN',
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
   * Revisi-di-tempat Retur Penjualan (need_fixing.md #19, pola §2.16a):
   * nomor tetap, revision_number++, jurnal+stok LAMA dibalik lalu diposting
   * ulang bertanggal dokumen (DocumentReviseService — jendela backdate,
   * K2). Faktur asal TIDAK bisa diganti (retur atas faktur lain = dokumen
   * lain: VOID + retur baru). Gerbang: kunci cetak intent EDIT; barang BS
   * dari retur ini belum terpakai.
   */
  async reviseReturn(
    id: string,
    dto: ReviseSalesReturnDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<SalesReturn> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === SalesReturnPostingStatus.VOIDED) {
      throw new BadRequestException(
        'Retur ini sudah VOID, tidak bisa direvisi.',
      );
    }
    if (dto.salesInvoiceId !== existing.salesInvoiceId) {
      throw new BadRequestException(
        'Faktur asal retur tidak bisa diganti — VOID retur ini lalu buat retur baru atas faktur yang benar.',
      );
    }
    this.validateSettlement(dto);

    await this.printLockService.preflight({
      table: 'sales_returns',
      sourceType: 'SALES_RETURN',
      documentId: id,
      documentLabel: existing.returnNumber,
      intent: 'EDIT',
      reason: dto.reason,
      user,
      authorizationRequestId,
    });

    await this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'sales_returns',
        sourceType: 'SALES_RETURN',
        documentId: id,
        documentLabel: existing.returnNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });
      // consume() SUDAH menaikkan revision_number kalau PRINTED (K4).
      const wasPrinted =
        existing.printStatus === SalesReturnPrintStatus.PRINTED;

      const invoice = await manager.findOne(SalesInvoice, {
        where: { id: existing.salesInvoiceId },
        relations: { lines: true },
      });
      if (
        !invoice ||
        invoice.postingStatus === SalesInvoicePostingStatus.VOIDED
      ) {
        throw new BadRequestException(
          'Faktur asal sudah VOID — retur ini tidak bisa direvisi, hanya di-VOID.',
        );
      }
      const customer = await manager.findOneOrFail(Customer, {
        where: { id: invoice.customerId },
      });
      const badStockWarehouse = await this.resolveBadStockWarehouse(manager);
      if (dto.settlementType === SalesReturnSettlementType.CASH) {
        await this.accountResolverService.assertAccountHasFlag(
          dto.cashAccountId!,
          'is_cash_account',
          'Kas/Bank',
          manager,
        );
      }
      const newReturnDate = parseDateOnly(dto.returnDate);

      await this.documentReviseService.revise({
        sourceType: 'SALES_RETURN',
        sourceId: id,
        originalDate: parseDateOnly(existing.returnDate),
        userId: user.sub,
        manager,
        reversalDescription: `Pembalik revisi retur penjualan ${existing.returnNumber}`,
        beforeReverse: (m) =>
          this.stockRecorderService.assertLotsUnconsumed(
            'SALES_RETURN',
            id,
            m,
            'Barang dari retur ini sudah keluar dari Bad Stock (diretur ke supplier/dipindah) — tidak bisa direvisi.',
          ),
        applyChanges: async (m): Promise<ApplyChangesResult> => {
          await m.update(SalesReturn, id, {
            returnDate: toDateOnlyString(newReturnDate),
            settlementType: dto.settlementType,
            cashAccountId: dto.cashAccountId ?? null,
            notes: dto.notes ?? null,
          });
          // Baris lama dihapus & ditulis ulang dalam SATU event revisi
          // (pola PurchaseInvoicesService.reviseInvoice); sales_return_lines
          // tidak dirujuk dokumen lain.
          await m.delete(SalesReturnLine, { salesReturnId: id });
          const { journalLines } = await this.postLinesAndBuildJournal({
            salesReturnId: id,
            returnNumber: existing.returnNumber,
            returnDate: newReturnDate,
            invoice,
            customer,
            dto,
            badStockWarehouseId: badStockWarehouse.id,
            userId: user.sub,
            manager: m,
          });
          return {
            repostDate: newReturnDate,
            journalDescription: `Retur Penjualan ${existing.returnNumber} (revisi)`,
            journalLines,
          };
        },
      });

      if (!wasPrinted) {
        await manager.increment(SalesReturn, { id }, 'revisionNumber', 1);
      }
    });

    return this.findOne(id);
  }

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). print_count
   * masuk audit_logs lewat @Audit('PRINT', ...) di controller.
   */
  async registerPrint(id: string): Promise<SalesReturn> {
    await this.printLockService.registerPrint({
      table: 'sales_returns',
      sourceType: 'SALES_RETURN',
      documentId: id,
    });
    return this.findOne(id);
  }

  // --- Helper --------------------------------------------------------------

  private validateSettlement(dto: CreateSalesReturnDto): void {
    const isCash = dto.settlementType === SalesReturnSettlementType.CASH;
    if (isCash && !dto.cashAccountId) {
      throw new BadRequestException(
        'cashAccountId wajib diisi untuk settlementType CASH.',
      );
    }
    if (!isCash && dto.cashAccountId) {
      throw new BadRequestException(
        'cashAccountId wajib kosong untuk settlementType REDUCE_INVOICE.',
      );
    }
  }

  /**
   * Sisa qty yang belum diretur untuk satu baris faktur — dijumlah dari
   * seluruh sales_return_lines non-VOID yang menunjuk baris itu (VOID belum
   * dibangun hari ini, filter posting_status tetap ditulis untuk jaga-jaga
   * masa depan).
   */
  private async getAlreadyReturnedQtyBaseUnit(
    salesInvoiceLineId: string,
    manager: EntityManager,
  ): Promise<number> {
    const rows: { total: string | null }[] = await manager.query(
      `SELECT SUM(srl.qty_base_unit) AS total
       FROM sales_return_lines srl
       JOIN sales_returns sr ON sr.id = srl.sales_return_id
       WHERE srl.sales_invoice_line_id = $1 AND sr.posting_status = 'POSTED'`,
      [salesInvoiceLineId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Total retur (total_amount) yang sudah tercatat atas satu faktur — dasar
   * validasi kumulatif "retur tidak boleh melebihi total faktur asal"
   * (pengganti sementara paid_amount, lihat komentar kelas di atas).
   */
  private async getAlreadyReturnedTotalCents(
    salesInvoiceId: string,
    excludeSalesReturnId: string,
    manager: EntityManager,
  ): Promise<number> {
    // excludeSalesReturnId: retur yang SEDANG diposting/direvisi tidak boleh
    // ikut terhitung (header-nya sudah ada sebelum totalnya diperbarui).
    const rows: { total: string | null }[] = await manager.query(
      `SELECT SUM(total_amount) AS total
       FROM sales_returns
       WHERE sales_invoice_id = $1 AND posting_status = 'POSTED' AND id <> $2`,
      [salesInvoiceId, excludeSalesReturnId],
    );
    return toCents(Number(rows[0]?.total ?? 0));
  }

  // Retur penjualan selalu ke BAD_STOCK (CLAUDE.md §3 "Bad stock") — pola
  // resolve sama resolveBadStockWarehouse() di purchase-returns.service.ts.
  private async resolveBadStockWarehouse(
    manager?: EntityManager,
  ): Promise<Warehouse> {
    const runner = manager
      ? manager.getRepository(Warehouse)
      : this.warehousesRepository;
    const defaultBadStock = await runner.findOne({
      where: {
        warehouseType: WarehouseType.BAD_STOCK,
        isDefault: true,
        isActive: true,
      },
    });
    if (defaultBadStock) {
      return defaultBadStock;
    }
    const anyBadStock = await runner.findOne({
      where: { warehouseType: WarehouseType.BAD_STOCK, isActive: true },
    });
    if (!anyBadStock) {
      throw new BadRequestException(
        'Gudang BAD_STOCK aktif tidak ditemukan — periksa data gudang sebelum membuat retur penjualan.',
      );
    }
    return anyBadStock;
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
