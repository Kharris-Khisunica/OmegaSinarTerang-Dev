import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { CreatePurchaseReturnLineDto } from './dto/create-purchase-return-line.dto';
import { PurchaseReturnQueryDto } from './dto/purchase-return-query.dto';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import {
  PurchaseReturn,
  PurchaseReturnPostingStatus,
  PurchaseReturnPrintStatus,
  PurchaseReturnSettlementType,
  PurchaseReturnUnitMode,
} from './entities/purchase-return.entity';

const SORTABLE_COLUMNS = ['returnNumber', 'returnDate', 'createdAt'] as const;

export interface CreatePurchaseReturnResult {
  purchaseReturn: PurchaseReturn;
  lines: PurchaseReturnLine[];
  journalEntry: JournalEntry;
}

export interface BadStockLotRow {
  productId: string;
  displayName: string;
  qtyAvailable: number;
  fifoNextUnitCost: number;
}

interface LineContext {
  dto: CreatePurchaseReturnLineDto;
  product: Product;
  qtyBaseUnit: number;
}

/**
 * Retur Pembelian (CLAUDE.md §3 "Bad stock" + §4 "Retur Pembelian", Hari 16)
 * — SELALU dari gudang BAD_STOCK, alur WAJIB pilih supplier dulu (lihat
 * findBadStockLots()), nilai retur DINEGOSIASIKAN (bisa beda dari harga
 * pokok FIFO). Orkestrasi satu dataSource.transaction() persis
 * PurchaseInvoicesService.create() — StockRecorderService (FIFO scoped ke
 * supplier terpilih, stok minus TIDAK diizinkan untuk retur — beda dari
 * penjualan), AccountResolverService (akun tanpa hardcode kode), dan
 * JournalPosterService.
 *
 * PR terbuka #2 (KONTEKS_REVISI §4.2): lot dari retur pelanggan (Hari 20+)
 * akan punya stock_cost_lots.supplier_id = NULL. findBadStockLots() memfilter
 * `supplier_id = :supplierId` — NULL tidak pernah match kesetaraan, jadi lot
 * ber-supplier NULL TIDAK PERNAH muncul di daftar manapun sampai klien
 * menjawab boleh/tidak diretur ke sembarang supplier. TODO eksplisit, bukan
 * ditebak.
 *
 * TIDAK memanggil PeriodLockValidatorService secara eksplisit — pola sama
 * PurchaseInvoicesService: backdate SUDAH divalidasi lewat
 * JournalPosterService.post() (memanggil periodLockValidatorService.validate()
 * di dalamnya untuk semua sourceType selain OPENING_BALANCE). Memanggilnya
 * lagi di sini akan redundan. Beda dengan WarehouseMutationsService yang
 * WAJIB memanggilnya eksplisit karena cabang titipan & transfer sama-sama
 * TIDAK PERNAH memanggil JournalPosterService (tanpa jurnal).
 */
@Injectable()
export class PurchaseReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseReturn)
    private readonly purchaseReturnsRepository: Repository<PurchaseReturn>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly printLockService: PrintLockService,
  ) {}

  async create(
    dto: CreatePurchaseReturnDto,
    user: AuthenticatedUser,
  ): Promise<CreatePurchaseReturnResult> {
    this.validateSettlement(dto);
    const returnDate = parseDateOnly(dto.returnDate);

    return this.dataSource.transaction(async (manager) => {
      const supplier = await manager.findOne(Supplier, {
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException(
          `Supplier ${dto.supplierId} tidak ditemukan.`,
        );
      }

      const badStockWarehouse = await this.resolveBadStockWarehouse(manager);
      const lineContexts = await this.resolveLineContexts(
        dto.lines,
        dto.unitMode,
        manager,
      );

      if (dto.settlementType === PurchaseReturnSettlementType.CASH) {
        await this.accountResolverService.assertAccountHasFlag(
          dto.cashAccountId!,
          'is_cash_account',
          'Kas/Bank',
          manager,
        );
      }

      const returnNumber = await this.documentCounterService.getNextNumber(
        'PURCHASE_RETURN',
        returnDate,
        manager,
      );

      const purchaseReturn = await manager.save(
        PurchaseReturn,
        manager.create(PurchaseReturn, {
          returnNumber,
          supplierId: supplier.id,
          returnDate: toDateOnlyString(returnDate),
          unitMode: dto.unitMode,
          settlementType: dto.settlementType,
          cashAccountId: dto.cashAccountId ?? null,
          subtotalAgreedAmount: '0.00',
          totalCostBasis: '0.00',
          differenceAmount: '0.00',
          postingStatus: PurchaseReturnPostingStatus.POSTED,
          printStatus: PurchaseReturnPrintStatus.NOT_PRINTED,
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );

      const savedLines: PurchaseReturnLine[] = [];
      let totalAgreedCents = 0;
      let totalCostBasisCents = 0;

      for (let i = 0; i < lineContexts.length; i++) {
        const ctx = lineContexts[i];

        // Stok minus TIDAK diizinkan untuk retur pembelian (beda dari §2.8
        // yang berlaku untuk penjualan) — barang yang diretur wajib benar-
        // benar ada di BAD_STOCK milik supplier ini.
        const recordOutResult = await this.stockRecorderService.recordOut(
          {
            productId: ctx.product.id,
            warehouseId: badStockWarehouse.id,
            qtyBaseUnit: ctx.qtyBaseUnit,
            movementDate: returnDate,
            movementType: StockMovementType.RETURN_OUT,
            sourceType: 'PURCHASE_RETURN',
            sourceId: purchaseReturn.id,
            createdBy: user.sub,
            supplierId: dto.supplierId,
            disallowNegativeStock: true,
          },
          manager,
        );

        const agreedAmountCents = toCents(
          ctx.dto.qtyInput * ctx.dto.agreedUnitPrice,
        );
        const costBasisCents = toCents(recordOutResult.totalCost);
        totalAgreedCents += agreedAmountCents;
        totalCostBasisCents += costBasisCents;

        const line = await manager.save(
          PurchaseReturnLine,
          manager.create(PurchaseReturnLine, {
            purchaseReturnId: purchaseReturn.id,
            lineOrder: i + 1,
            productId: ctx.product.id,
            qtyInput: ctx.dto.qtyInput.toFixed(4),
            qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
            agreedUnitPrice: ctx.dto.agreedUnitPrice.toFixed(2),
            agreedAmount: fromCents(agreedAmountCents).toFixed(2),
            costBasisUnitCost: (
              recordOutResult.totalCost / ctx.qtyBaseUnit
            ).toFixed(4),
            costBasisAmount: fromCents(costBasisCents).toFixed(2),
            stockMovementId: recordOutResult.movement.id,
          }),
        );
        savedLines.push(line);
      }

      const diffCents = totalAgreedCents - totalCostBasisCents;

      await manager.update(PurchaseReturn, purchaseReturn.id, {
        subtotalAgreedAmount: fromCents(totalAgreedCents).toFixed(2),
        totalCostBasis: fromCents(totalCostBasisCents).toFixed(2),
        differenceAmount: fromCents(diffCents).toFixed(2),
      });

      // --- Jurnal: Hutang/Kas (D) / Persediaan (K) / [Selisih Retur (K/D)] -
      const inventoryAccountId =
        await this.accountResolverService.resolveSingleActive(
          'is_inventory_account = true',
          'Persediaan',
          manager,
        );
      const debitAccountId =
        dto.settlementType === PurchaseReturnSettlementType.CASH
          ? dto.cashAccountId!
          : await this.accountResolverService.resolveSingleActive(
              'is_payable_account = true',
              'Hutang Usaha',
              manager,
            );

      const journalLines: PostJournalLineDto[] = [
        {
          accountId: debitAccountId,
          debit: fromCents(totalAgreedCents),
          credit: 0,
          description: `Retur Pembelian ${returnNumber}`,
        },
        {
          accountId: inventoryAccountId,
          debit: 0,
          credit: fromCents(totalCostBasisCents),
          description: `Persediaan dari retur pembelian ${returnNumber}`,
        },
      ];

      if (diffCents !== 0) {
        const diffAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_purchase_return_diff_account = true',
            'Selisih Retur Pembelian',
            manager,
          );
        journalLines.push({
          accountId: diffAccountId,
          debit: diffCents < 0 ? fromCents(-diffCents) : 0,
          credit: diffCents > 0 ? fromCents(diffCents) : 0,
          description: `Selisih retur pembelian ${returnNumber}`,
        });
      }

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: returnDate,
          description: `Retur Pembelian ${returnNumber}`,
          sourceType: 'PURCHASE_RETURN',
          sourceId: purchaseReturn.id,
          createdBy: user.sub,
          lines: journalLines,
        },
        manager,
      );

      const finalReturn = await manager.findOne(PurchaseReturn, {
        where: { id: purchaseReturn.id },
      });

      return {
        purchaseReturn: finalReturn!,
        lines: savedLines,
        journalEntry,
      };
    });
  }

  async findAll(
    query: PurchaseReturnQueryDto,
  ): Promise<PaginatedResult<PurchaseReturn>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'returnDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.purchaseReturnsRepository.createQueryBuilder('ret');
    if (query.search) {
      qb.andWhere('ret.returnNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.supplierId) {
      qb.andWhere('ret.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }

    qb.orderBy(`ret.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<PurchaseReturn> {
    const purchaseReturn = await this.purchaseReturnsRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!purchaseReturn) {
      throw new BadRequestException('Retur pembelian tidak ditemukan.');
    }
    return purchaseReturn;
  }

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). print_count
   * masuk audit_logs lewat @Audit('PRINT', ...) di controller.
   */
  async registerPrint(id: string): Promise<PurchaseReturn> {
    await this.printLockService.registerPrint({
      table: 'purchase_returns',
      sourceType: 'PURCHASE_RETURN',
      documentId: id,
    });
    return this.findOne(id);
  }

  /**
   * Alur WAJIB "pilih supplier dulu" (CLAUDE.md §3 "Bad stock") — daftar BS
   * disaring ke produk yang pernah dibeli dari supplier itu, TIDAK menunjuk
   * faktur pembelian asal.
   *
   * `fifoNextUnitCost` = unit_cost lot TERTUA (lot_date ASC) per produk —
   * BUKAN rata-rata — karena itulah harga pokok yang akan sungguh terpakai
   * untuk unit PERTAMA yang diretur (StockRecorderService.recordOut()
   * mengonsumsi FIFO urut lot_date tertua, sama seperti di seluruh
   * codebase ini). Ini murni REFERENSI untuk operator saat menegosiasikan
   * `agreedUnitPrice` (CLAUDE.md §4 "Retur Pembelian") — nilai retur
   * sungguhan boleh beda, itu justru yang membentuk `Selisih Retur
   * Pembelian`. Kalau qty yang diretur melebihi qty lot tertua itu,
   * `costBasisAmount` final (dihitung di create()) akan mencampur lot
   * berikutnya dan bisa beda dari referensi ini — disengaja, bukan bug.
   */
  async findBadStockLots(supplierId: string): Promise<BadStockLotRow[]> {
    const badStockWarehouse = await this.resolveBadStockWarehouse();
    const rows: {
      product_id: string;
      qty_available: string;
      fifo_next_unit_cost: string;
    }[] = await this.dataSource.query(
      `SELECT product_id,
              SUM(qty_remaining) AS qty_available,
              (array_agg(unit_cost ORDER BY lot_date ASC))[1] AS fifo_next_unit_cost
       FROM stock_cost_lots
       WHERE warehouse_id = $1 AND supplier_id = $2 AND qty_remaining > 0
       GROUP BY product_id`,
      [badStockWarehouse.id, supplierId],
    );
    if (rows.length === 0) {
      return [];
    }
    const products = await this.dataSource.manager.find(Product, {
      where: rows.map((row) => ({ id: row.product_id })),
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    return rows.map((row) => ({
      productId: row.product_id,
      displayName:
        productById.get(row.product_id)?.displayName ?? row.product_id,
      qtyAvailable: Number(row.qty_available),
      fifoNextUnitCost: Number(row.fifo_next_unit_cost),
    }));
  }

  // --- Helper --------------------------------------------------------------

  private validateSettlement(dto: CreatePurchaseReturnDto): void {
    const isCash = dto.settlementType === PurchaseReturnSettlementType.CASH;
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

  private async resolveLineContexts(
    lines: CreatePurchaseReturnLineDto[],
    unitMode: PurchaseReturnUnitMode,
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
      const qtyBaseUnit = this.resolveQtyBaseUnit(
        product,
        unitMode,
        lineDto.qtyInput,
      );
      contexts.push({ dto: lineDto, product, qtyBaseUnit });
    }
    return contexts;
  }

  /**
   * unitMode dikunci di header (keputusan desain #1, CLAUDE.md §3) — tidak
   * ada unitId per baris. KECIL = base unit langsung. BESAR = satuan besar
   * produk, WAJIB tepat satu baris terdaftar di product_unit_conversions
   * (pola sama AccountResolverService.resolveSingleActive's "count harus
   * tepat 1") — TIDAK PERNAH diam-diam pakai yang pertama kalau ada lebih
   * dari satu, konsisten resolveConversionFactor() di
   * purchase-invoices.service.ts yang juga menolak eksplisit alih-alih
   * menebak.
   */
  private resolveQtyBaseUnit(
    product: Product,
    unitMode: PurchaseReturnUnitMode,
    qtyInput: number,
  ): number {
    if (unitMode === PurchaseReturnUnitMode.KECIL) {
      return roundTo(qtyInput, 4);
    }
    const conversions = product.unitConversions ?? [];
    if (conversions.length === 0) {
      throw new BadRequestException(
        `Produk ${product.displayName} tidak punya satuan besar terdaftar — pakai mode KECIL untuk produk ini.`,
      );
    }
    if (conversions.length > 1) {
      throw new BadRequestException(
        `Produk ${product.displayName} punya lebih dari satu satuan besar terdaftar — data tidak sesuai konvensi 1 produk 1 satuan besar, periksa master produk.`,
      );
    }
    return roundTo(qtyInput * Number(conversions[0].qtyInBaseUnit), 4);
  }

  // Retur pembelian selalu dari BAD_STOCK (CLAUDE.md §3 "Bad stock") — pola
  // resolve sama resolveStoreWarehouse() di purchase-invoices.service.ts.
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
        'Gudang BAD_STOCK aktif tidak ditemukan — periksa data gudang sebelum membuat retur pembelian.',
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
