import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidEngineService } from '../../core/void/void.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { SaveStockOpnameDto } from './dto/save-stock-opname.dto';
import { StockOpnameQueryDto } from './dto/stock-opname-query.dto';
import { VoidStockOpnameDto } from './dto/void-stock-opname.dto';
import { StockOpnameLine } from './entities/stock-opname-line.entity';
import { StockOpname, StockOpnameStatus } from './entities/stock-opname.entity';

const SORTABLE_COLUMNS = ['documentNumber', 'countDate', 'createdAt'] as const;
const QTY_EPSILON = 1e-6;

/**
 * Stok Opname tersimpan + koreksi stok (need_fixing.md #25, opsi 2b —
 * belum dikonfirmasi ulang ke klien, pola sama Payment §2.12).
 *
 * - save()/update(): MASTER/SUPERVISOR (sama dengan akses worksheet, R11/L1)
 *   menyimpan hitungan fisik sebagai DRAFT + SNAPSHOT stok sistem STORE saat
 *   itu. Tidak menyentuh stok/jurnal sama sekali.
 * - post(): MASTER saja — inilah PERSETUJUAN koreksi. Selisih dihitung dari
 *   snapshot (physical − system saat dihitung), bukan stok saat posting:
 *   transaksi yang terjadi di antara hitung & posting sudah tercatat sendiri.
 *   Kurang -> recordOut FIFO (stok minus diizinkan, §2.8) bernilai harga
 *   pokok lot yang terkonsumsi; lebih -> recordIn lot baru bernilai
 *   getLatestCostBasis() (lot bonus 0 dilewati, §3 "Bonus"). Jurnal:
 *   Selisih Persediaan (D) / Persediaan (K) untuk kurang, kebalikannya untuk
 *   lebih. Bertanggal HARI POSTING (validator backdate biasa, §2.9) — tanggal
 *   hitung disimpan terpisah di count_date.
 * - void(): DRAFT -> cukup VOIDED; POSTED -> VoidEngineService (jurnal &
 *   stok pembalik bertanggal hari ini, §2.2). Hook menolak kalau lot surplus
 *   dari opname ini sudah terjual.
 */
@Injectable()
export class StockOpnamesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly documentCounterService: DocumentCounterService,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly accountResolverService: AccountResolverService,
    private readonly periodLockValidatorService: PeriodLockValidatorService,
    private readonly voidEngineService: VoidEngineService,
  ) {}

  async create(
    dto: SaveStockOpnameDto,
    user: AuthenticatedUser,
  ): Promise<StockOpname> {
    this.assertUniqueProducts(dto);
    const countDate = parseDateOnly(dto.countDate);
    const id = await this.dataSource.transaction(async (manager) => {
      await this.periodLockValidatorService.validate(countDate, manager);
      const warehouse = await this.resolveStoreWarehouse(manager);
      const documentNumber = await this.documentCounterService.getNextNumber(
        'STOCK_OPNAME',
        countDate,
        manager,
      );
      const opname = await manager.save(
        StockOpname,
        manager.create(StockOpname, {
          documentNumber,
          countDate: dto.countDate,
          warehouseId: warehouse.id,
          status: StockOpnameStatus.DRAFT,
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );
      await this.writeLines(opname.id, warehouse.id, dto, manager);
      return opname.id;
    });
    return this.findOne(id);
  }

  /** Ubah hitungan selama DRAFT — baris diganti penuh, snapshot diambil ulang. */
  async update(id: string, dto: SaveStockOpnameDto): Promise<StockOpname> {
    this.assertUniqueProducts(dto);
    const countDate = parseDateOnly(dto.countDate);
    await this.dataSource.transaction(async (manager) => {
      const opname = await this.lockOpname(id, manager);
      if (opname.status !== StockOpnameStatus.DRAFT) {
        throw new BadRequestException(
          'Stok opname yang sudah diposting/dibatalkan tidak bisa diubah.',
        );
      }
      await this.periodLockValidatorService.validate(countDate, manager);
      await manager.update(StockOpname, id, {
        countDate: dto.countDate,
        notes: dto.notes ?? null,
      });
      await manager.delete(StockOpnameLine, { stockOpnameId: id });
      await this.writeLines(id, opname.warehouseId, dto, manager);
    });
    return this.findOne(id);
  }

  /** Posting = persetujuan koreksi (MASTER, dijaga di controller). */
  async post(id: string, user: AuthenticatedUser): Promise<StockOpname> {
    await this.dataSource.transaction(async (manager) => {
      const opname = await this.lockOpname(id, manager);
      if (opname.status !== StockOpnameStatus.DRAFT) {
        throw new BadRequestException(
          'Hanya stok opname berstatus DRAFT yang bisa diposting.',
        );
      }
      const lines = await manager.find(StockOpnameLine, {
        where: { stockOpnameId: id },
        order: { lineOrder: 'ASC' },
      });
      const today = startOfUtcToday();

      let shortageCents = 0;
      let surplusCents = 0;
      for (const line of lines) {
        const diff = Number(line.diffQtyBase);
        if (Math.abs(diff) < QTY_EPSILON) continue;

        if (diff < 0) {
          const out = await this.stockRecorderService.recordOut(
            {
              productId: line.productId,
              warehouseId: opname.warehouseId,
              qtyBaseUnit: -diff,
              movementDate: today,
              movementType: StockMovementType.ADJUSTMENT,
              sourceType: 'STOCK_OPNAME',
              sourceId: id,
              createdBy: user.sub,
            },
            manager,
          );
          const valueCents = Math.round(out.totalCost * 100);
          shortageCents += valueCents;
          await manager.update(StockOpnameLine, line.id, {
            unitCost: (out.totalCost / -diff).toFixed(4),
            diffValue: (-valueCents / 100).toFixed(2),
            stockMovementId: out.movement.id,
          });
        } else {
          const unitCost = await this.stockRecorderService.getLatestCostBasis(
            line.productId,
            manager,
          );
          const movement = await this.stockRecorderService.recordIn(
            {
              productId: line.productId,
              warehouseId: opname.warehouseId,
              qtyBaseUnit: diff,
              unitCost,
              lotDate: today,
              movementDate: today,
              movementType: StockMovementType.ADJUSTMENT,
              sourceType: 'STOCK_OPNAME',
              sourceId: id,
              createdBy: user.sub,
            },
            manager,
          );
          const valueCents = Math.round(diff * unitCost * 100);
          surplusCents += valueCents;
          await manager.update(StockOpnameLine, line.id, {
            unitCost: unitCost.toFixed(4),
            diffValue: (valueCents / 100).toFixed(2),
            stockMovementId: movement.id,
          });
        }
      }

      const journalLines = await this.buildJournalLines(
        opname.documentNumber,
        shortageCents,
        surplusCents,
        manager,
      );
      if (journalLines.length > 0) {
        await this.journalPosterService.post(
          {
            entryDate: today,
            description: `Koreksi Stok Opname ${opname.documentNumber}`,
            sourceType: 'STOCK_OPNAME',
            sourceId: id,
            createdBy: user.sub,
            lines: journalLines,
          },
          manager,
        );
      }

      await manager.update(StockOpname, id, {
        status: StockOpnameStatus.POSTED,
        postedBy: user.sub,
        postedAt: new Date(),
        shortageValue: (shortageCents / 100).toFixed(2),
        surplusValue: (surplusCents / 100).toFixed(2),
      });
    });
    return this.findOne(id);
  }

  async voidOpname(
    id: string,
    dto: VoidStockOpnameDto,
    user: AuthenticatedUser,
  ): Promise<StockOpname> {
    await this.dataSource.transaction(async (manager) => {
      const opname = await this.lockOpname(id, manager);
      if (opname.status === StockOpnameStatus.VOIDED) {
        throw new BadRequestException('Stok opname ini sudah dibatalkan.');
      }
      if (opname.status === StockOpnameStatus.DRAFT) {
        await manager.update(StockOpname, id, {
          status: StockOpnameStatus.VOIDED,
          voidReasonCode: dto.reasonCode,
          voidReasonNote: dto.reasonNote,
        });
        return;
      }
      const activeEntry = await this.journalPosterService.findActiveEntry(
        'STOCK_OPNAME',
        id,
        manager,
      );
      if (activeEntry) {
        // Jurnal + stok dibalik, markVoided() lewat StockOpnameVoidHook.
        await this.voidEngineService.voidDocument({
          sourceType: 'STOCK_OPNAME',
          sourceId: id,
          reasonCode: dto.reasonCode,
          reasonNote: dto.reasonNote,
          userId: user.sub,
          manager,
        });
        return;
      }
      // Opname POSTED tanpa jurnal (semua selisih bernilai 0, mis. produk
      // tanpa riwayat harga pokok) — VoidEngineService mensyaratkan jurnal,
      // jadi stoknya dibalik langsung lewat StockRecorderService (tetap satu
      // pintu stok, §2.5).
      await this.stockRecorderService.assertLotsUnconsumed(
        'STOCK_OPNAME',
        id,
        manager,
        'Barang lebih dari opname ini sudah terjual — tidak bisa dibatalkan.',
      );
      const movements = await this.stockRecorderService.findActiveMovements(
        'STOCK_OPNAME',
        id,
        manager,
      );
      for (const movement of movements) {
        if (Number(movement.qtyBaseUnit) > 0) {
          await this.stockRecorderService.reverseIn(
            movement.id,
            user.sub,
            manager,
          );
        } else {
          await this.stockRecorderService.reverseOut(
            movement.id,
            user.sub,
            manager,
          );
        }
      }
      await manager.update(StockOpname, id, {
        status: StockOpnameStatus.VOIDED,
        voidReasonCode: dto.reasonCode,
        voidReasonNote: dto.reasonNote,
      });
    });
    return this.findOne(id);
  }

  async findAll(
    query: StockOpnameQueryDto,
  ): Promise<PaginatedResult<StockOpname>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'countDate',
    );
    const sortDir = resolveSortDir(query.sortDir);
    const qb = this.dataSource
      .getRepository(StockOpname)
      .createQueryBuilder('op');
    if (query.search) {
      qb.andWhere('op.documentNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.status) {
      qb.andWhere('op.status = :status', { status: query.status });
    }
    qb.orderBy(`op.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);
    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<StockOpname> {
    const opname = await this.dataSource.getRepository(StockOpname).findOne({
      where: { id },
      relations: { lines: true },
      order: { lines: { lineOrder: 'ASC' } },
    });
    if (!opname) {
      throw new BadRequestException('Stok opname tidak ditemukan.');
    }
    return opname;
  }

  // --- Helper ------------------------------------------------------------

  private assertUniqueProducts(dto: SaveStockOpnameDto): void {
    const seen = new Set<string>();
    for (const line of dto.lines) {
      if (seen.has(line.productId)) {
        throw new BadRequestException(
          'Satu produk hanya boleh muncul sekali dalam satu stok opname.',
        );
      }
      seen.add(line.productId);
    }
  }

  private async writeLines(
    opnameId: string,
    warehouseId: string,
    dto: SaveStockOpnameDto,
    manager: EntityManager,
  ): Promise<void> {
    const productIds = dto.lines.map((l) => l.productId);
    const balances: { product_id: string; qty: string }[] = await manager.query(
      `SELECT product_id, SUM(qty_base_unit) AS qty FROM product_stock_balance
       WHERE warehouse_id = $1 AND product_id = ANY($2)
       GROUP BY product_id`,
      [warehouseId, productIds],
    );
    const systemByProduct = new Map(
      balances.map((b) => [b.product_id, Number(b.qty)]),
    );
    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      const system = systemByProduct.get(line.productId) ?? 0;
      const diff = roundTo(line.physicalQtyBase - system, 4);
      await manager.save(
        StockOpnameLine,
        manager.create(StockOpnameLine, {
          stockOpnameId: opnameId,
          lineOrder: i + 1,
          productId: line.productId,
          systemQtyBase: system.toFixed(4),
          physicalQtyBase: line.physicalQtyBase.toFixed(4),
          diffQtyBase: diff.toFixed(4),
          unitCost: null,
          diffValue: null,
          stockMovementId: null,
        }),
      );
    }
  }

  private async buildJournalLines(
    documentNumber: string,
    shortageCents: number,
    surplusCents: number,
    manager: EntityManager,
  ): Promise<PostJournalLineDto[]> {
    if (shortageCents === 0 && surplusCents === 0) return [];
    const inventoryAccountId =
      await this.accountResolverService.resolveSingleActive(
        'is_inventory_account = true',
        'Persediaan',
        manager,
      );
    const diffAccountId = await this.accountResolverService.resolveSingleActive(
      'is_stock_opname_diff_account = true',
      'Selisih Persediaan (Stok Opname)',
      manager,
    );
    const lines: PostJournalLineDto[] = [];
    if (shortageCents > 0) {
      lines.push(
        {
          accountId: diffAccountId,
          debit: shortageCents / 100,
          credit: 0,
          description: `Stok kurang — opname ${documentNumber}`,
        },
        {
          accountId: inventoryAccountId,
          debit: 0,
          credit: shortageCents / 100,
          description: `Stok kurang — opname ${documentNumber}`,
        },
      );
    }
    if (surplusCents > 0) {
      lines.push(
        {
          accountId: inventoryAccountId,
          debit: surplusCents / 100,
          credit: 0,
          description: `Stok lebih — opname ${documentNumber}`,
        },
        {
          accountId: diffAccountId,
          debit: 0,
          credit: surplusCents / 100,
          description: `Stok lebih — opname ${documentNumber}`,
        },
      );
    }
    return lines;
  }

  private async lockOpname(
    id: string,
    manager: EntityManager,
  ): Promise<StockOpname> {
    const rows: { id: string }[] = await manager.query(
      `SELECT id FROM stock_opnames WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      throw new BadRequestException('Stok opname tidak ditemukan.');
    }
    return manager.findOneOrFail(StockOpname, { where: { id } });
  }

  private async resolveStoreWarehouse(
    manager: EntityManager,
  ): Promise<Warehouse> {
    const repo = manager.getRepository(Warehouse);
    const store =
      (await repo.findOne({
        where: {
          warehouseType: WarehouseType.STORE,
          isDefault: true,
          isActive: true,
        },
      })) ??
      (await repo.findOne({
        where: { warehouseType: WarehouseType.STORE, isActive: true },
      }));
    if (!store) {
      throw new BadRequestException('Gudang STORE aktif tidak ditemukan.');
    }
    return store;
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function startOfUtcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
