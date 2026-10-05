import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { ProductsService } from '../../modules/products/products.service';
import { Product } from '../../modules/products/entities/product.entity';
import { Warehouse } from '../../modules/warehouses/entities/warehouse.entity';
import { StockCostConsumption } from '../../modules/stock/entities/stock-cost-consumption.entity';
import { StockCostLot } from '../../modules/stock/entities/stock-cost-lot.entity';
import {
  StockMovement,
  StockMovementType,
} from '../../modules/stock/entities/stock-movement.entity';
import {
  ReconcileFilter,
  ReconcileRow,
  RecordInDto,
  RecordOutDto,
  RecordOutResult,
  TransferDto,
  TransferResult,
} from './dto/stock-recorder.dto';
import { computeQtyBreakdown } from './qty-breakdown';

interface FifoPortion {
  lotId: string;
  qty: number;
  unitCost: number;
  supplierId: string | null;
  lotDate: string;
}

interface FifoConsumeResult {
  portions: FifoPortion[];
  totalCost: number;
  /** Qty yang TIDAK bisa dipenuhi dari lot nyata (stok minus, §2.8). */
  shortfallQty: number;
}

/**
 * Opsional di reverseIn()/reverseOut() — default keduanya mereproduksi
 * PERSIS perilaku VOID lama (movementDate=hari ini, sourceType=
 * 'VOID_REVERSAL'). DocumentReviseService (paket R6) mengisi keduanya:
 * movementDate = tanggal dokumen ASLI (K2, CLAUDE.md §2.2 pengecualian
 * jalur revisi) dan reversalSourceType = 'REVISION_REVERSAL' supaya
 * findActiveMovements() bisa membedakan movement yang sudah dibalik revisi
 * dari movement yang masih berlaku.
 */
interface ReverseOpts {
  movementDate?: Date;
  reversalSourceType?: string;
}

/**
 * Satu-satunya jalur resmi menulis stok (CLAUDE.md §2.5) — jantung
 * persediaan, blocker semua modul transaksi. WAJIB dipanggil dengan
 * EntityManager dari transaction pemanggil (pola sama JournalPosterService)
 * supaya movement+lot+balance+jurnal jadi satu DB transaction (§2.3).
 *
 * FIFO row-lock (§2.7): consumeFifo() SELECT ... FOR UPDATE urut lot_date
 * ASC, id ASC — wajib, bukan opsional. Tanpa lock ini dua transaksi
 * bersamaan atas produk yang sama bisa mengonsumsi lot yang sama dua kali.
 *
 * Stok minus (§2.8): recordOut/transfer tidak pernah menolak kekurangan
 * stok. Kekurangan (shortfallQty) dikosting pakai getLatestCostBasis() —
 * lot berharga nol (bonus) WAJIB dilewati saat mencari basis itu.
 */
@Injectable()
export class StockRecorderService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async recordIn(
    dto: RecordInDto,
    manager: EntityManager,
  ): Promise<StockMovement> {
    if (dto.qtyBaseUnit <= 0) {
      throw new BadRequestException(
        'qtyBaseUnit harus lebih besar dari 0 untuk recordIn.',
      );
    }

    const movement = manager.create(StockMovement, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      movementType: dto.movementType,
      qtyBaseUnit: dto.qtyBaseUnit.toFixed(4),
      unitCost: dto.unitCost.toFixed(4),
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      movementDate: toDateOnlyString(dto.movementDate),
      createdBy: dto.createdBy,
    });
    const savedMovement = await manager.save(StockMovement, movement);

    const lot = manager.create(StockCostLot, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      lotDate: toDateOnlyString(dto.lotDate),
      qtyIn: dto.qtyBaseUnit.toFixed(4),
      qtyRemaining: dto.qtyBaseUnit.toFixed(4),
      unitCost: dto.unitCost.toFixed(4),
      supplierId: dto.supplierId ?? null,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      // Kunci presisi dipakai reverseIn()/assertLotsUnconsumed() (paket R6)
      // untuk membedakan lot posting ini dari lot posting lama yang sudah
      // dibalik revisi sebelumnya — lihat komentar migration
      // AddMovementIdToStockCostLots.
      movementId: savedMovement.id,
    });
    await manager.save(StockCostLot, lot);

    await this.upsertBalance(
      dto.productId,
      dto.warehouseId,
      dto.qtyBaseUnit,
      manager,
    );
    await this.productsService.lockCode(dto.productId, manager);

    return savedMovement;
  }

  async recordOut(
    dto: RecordOutDto,
    manager: EntityManager,
  ): Promise<RecordOutResult> {
    if (dto.qtyBaseUnit <= 0) {
      throw new BadRequestException(
        'qtyBaseUnit harus lebih besar dari 0 untuk recordOut.',
      );
    }

    const {
      portions,
      totalCost: lotCost,
      shortfallQty,
    } = await this.consumeFifo(
      dto.productId,
      dto.warehouseId,
      dto.qtyBaseUnit,
      manager,
      dto.supplierId,
    );

    if (shortfallQty > 0 && dto.disallowNegativeStock) {
      throw new BadRequestException(
        dto.supplierId
          ? 'Stok barang rusak dari supplier ini tidak mencukupi untuk retur sejumlah ini.'
          : 'Stok tidak mencukupi untuk operasi ini.',
      );
    }

    let totalCost = lotCost;
    if (shortfallQty > 0) {
      const fallbackUnitCost = await this.getLatestCostBasis(
        dto.productId,
        manager,
      );
      totalCost += shortfallQty * fallbackUnitCost;
    }
    const avgUnitCost = totalCost / dto.qtyBaseUnit;

    const movement = manager.create(StockMovement, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      movementType: dto.movementType,
      qtyBaseUnit: (-dto.qtyBaseUnit).toFixed(4),
      unitCost: avgUnitCost.toFixed(4),
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      movementDate: toDateOnlyString(dto.movementDate),
      createdBy: dto.createdBy,
    });
    const savedMovement = await manager.save(StockMovement, movement);

    const consumptions = await this.saveConsumptions(
      portions,
      savedMovement.id,
      manager,
    );

    await this.upsertBalance(
      dto.productId,
      dto.warehouseId,
      -dto.qtyBaseUnit,
      manager,
    );
    await this.productsService.lockCode(dto.productId, manager);

    const stockWarning = await this.buildStockWarningIfNegative(
      dto.productId,
      dto.warehouseId,
      manager,
    );

    return { movement: savedMovement, totalCost, consumptions, stockWarning };
  }

  /**
   * Lot ikut pindah dengan unit_cost SAMA (bukan lot baru berharga rata-
   * rata) — satu lot tujuan baru per porsi lot asal yang dikonsumsi, supaya
   * jejak biaya per-porsi tidak hilang kalau sumbernya lebih dari satu lot.
   * Tanpa jurnal (CLAUDE.md §3 "Mutasi gudang").
   */
  async transfer(
    dto: TransferDto,
    manager: EntityManager,
  ): Promise<TransferResult> {
    if (dto.qtyBaseUnit <= 0) {
      throw new BadRequestException(
        'qtyBaseUnit harus lebih besar dari 0 untuk transfer.',
      );
    }
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException(
        'Gudang asal dan tujuan transfer tidak boleh sama.',
      );
    }

    const {
      portions,
      totalCost: lotCost,
      shortfallQty,
    } = await this.consumeFifo(
      dto.productId,
      dto.fromWarehouseId,
      dto.qtyBaseUnit,
      manager,
    );

    let totalCost = lotCost;
    let fallbackUnitCost = 0;
    if (shortfallQty > 0) {
      fallbackUnitCost = await this.getLatestCostBasis(dto.productId, manager);
      totalCost += shortfallQty * fallbackUnitCost;
    }
    const avgUnitCost = totalCost / dto.qtyBaseUnit;

    const movementOut = manager.create(StockMovement, {
      productId: dto.productId,
      warehouseId: dto.fromWarehouseId,
      movementType: StockMovementType.TRANSFER,
      qtyBaseUnit: (-dto.qtyBaseUnit).toFixed(4),
      unitCost: avgUnitCost.toFixed(4),
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      movementDate: toDateOnlyString(dto.movementDate),
      createdBy: dto.createdBy,
    });
    const savedMovementOut = await manager.save(StockMovement, movementOut);
    await this.saveConsumptions(portions, savedMovementOut.id, manager);

    const movementIn = manager.create(StockMovement, {
      productId: dto.productId,
      warehouseId: dto.toWarehouseId,
      movementType: StockMovementType.TRANSFER,
      qtyBaseUnit: dto.qtyBaseUnit.toFixed(4),
      unitCost: avgUnitCost.toFixed(4),
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      movementDate: toDateOnlyString(dto.movementDate),
      createdBy: dto.createdBy,
    });
    const savedMovementIn = await manager.save(StockMovement, movementIn);

    for (const portion of portions) {
      const destLot = manager.create(StockCostLot, {
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        lotDate: portion.lotDate,
        qtyIn: portion.qty.toFixed(4),
        qtyRemaining: portion.qty.toFixed(4),
        unitCost: portion.unitCost.toFixed(4),
        supplierId: portion.supplierId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        // Hygiene saja — reverseIn() menolak movement TRANSFER secara
        // eksplisit, jadi movement_id lot ini tidak pernah dibaca. Diisi
        // supaya tidak ada lot baru yang NULL tanpa alasan.
        movementId: savedMovementIn.id,
      });
      await manager.save(StockCostLot, destLot);
    }
    if (shortfallQty > 0) {
      // Stok sumber sudah minus sebelum transfer ini (lot fisik tidak
      // cukup) — porsi ini tidak mewakili lot nyata yang benar-benar
      // dipindah, jadi source_id/supplier tidak bisa dijamin akurat.
      const destLot = manager.create(StockCostLot, {
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        lotDate: toDateOnlyString(dto.movementDate),
        qtyIn: shortfallQty.toFixed(4),
        qtyRemaining: shortfallQty.toFixed(4),
        unitCost: fallbackUnitCost.toFixed(4),
        supplierId: null,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        movementId: savedMovementIn.id,
      });
      await manager.save(StockCostLot, destLot);
    }

    await this.upsertBalance(
      dto.productId,
      dto.fromWarehouseId,
      -dto.qtyBaseUnit,
      manager,
    );
    await this.upsertBalance(
      dto.productId,
      dto.toWarehouseId,
      dto.qtyBaseUnit,
      manager,
    );
    await this.productsService.lockCode(dto.productId, manager);

    const stockWarning = await this.buildStockWarningIfNegative(
      dto.productId,
      dto.fromWarehouseId,
      manager,
    );

    return {
      movementOut: savedMovementOut,
      movementIn: savedMovementIn,
      stockWarning,
    };
  }

  /**
   * Membalik satu movement MASUK (mis. hasil recordIn dari pembelian) —
   * dipanggil VoidEngineService (Hari 11), tidak pernah langsung dari modul
   * dokumen. Menolak kalau lot yang dibentuk movement ini sudah terkonsumsi
   * sebagian (§2.1 CLAUDE.md: koreksi barang yang sudah terjual lewat retur
   * pembelian, bukan pembatalan langsung). Lot ASLI tidak dihapus (no hard-
   * delete) — hanya qty_remaining dinolkan, dan movement pembalik baru
   * ditulis (ledger tetap append-only).
   */
  async reverseIn(
    movementId: string,
    userId: string,
    manager: EntityManager,
    opts?: ReverseOpts,
  ): Promise<StockMovement> {
    const movement = await manager.findOne(StockMovement, {
      where: { id: movementId },
    });
    if (!movement) {
      throw new BadRequestException(
        'Movement stok untuk dibalik tidak ditemukan.',
      );
    }
    if (Number(movement.qtyBaseUnit) <= 0) {
      throw new BadRequestException(
        'reverseIn hanya berlaku untuk movement masuk (qty_base_unit positif).',
      );
    }
    if (movement.movementType === StockMovementType.TRANSFER) {
      throw new BadRequestException(
        'VOID untuk mutasi gudang (transfer) belum didukung — akan dikerjakan Hari 13.',
      );
    }

    // Dikunci ke movement_id PERSIS (paket R6, migration
    // AddMovementIdToStockCostLots) — BUKAN lagi product+warehouse+source
    // dokumen. Sebelum revisi ada, satu movement selalu satu-satunya
    // pembentuk lot untuk kombinasi itu, jadi hasilnya sama. Begitu dokumen
    // yang sama recordIn() produk yang sama lebih dari sekali (revisi
    // in-place), kunci lama akan menganggap lot posting LAMA yang sudah
    // dibalik (qty_remaining=0) sebagai "barang sudah terjual" tanpa alasan
    // — kunci movement_id menghindari itu sepenuhnya.
    const lots: { id: string; qty_in: string; qty_remaining: string }[] =
      await manager.query(
        `SELECT id, qty_in, qty_remaining FROM stock_cost_lots
         WHERE movement_id = $1
         FOR UPDATE`,
        [movement.id],
      );
    if (lots.length === 0) {
      throw new BadRequestException(
        'Lot yang dibentuk movement ini tidak ditemukan.',
      );
    }
    for (const lot of lots) {
      if (Number(lot.qty_remaining) !== Number(lot.qty_in)) {
        throw new BadRequestException(
          'Barang dari faktur ini sudah terjual. Buat retur pembelian, bukan pembatalan.',
        );
      }
    }

    let totalQtyIn = 0;
    for (const lot of lots) {
      totalQtyIn += Number(lot.qty_in);
      await manager.query(
        `UPDATE stock_cost_lots SET qty_remaining = 0 WHERE id = $1`,
        [lot.id],
      );
    }

    const reversal = manager.create(StockMovement, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      movementType: StockMovementType.ADJUSTMENT,
      qtyBaseUnit: (-totalQtyIn).toFixed(4),
      unitCost: movement.unitCost,
      // Default 'VOID_REVERSAL' (perilaku VOID TIDAK berubah, §2.2 CLAUDE.md)
      // — DocumentReviseService (paket R6) mengisi 'REVISION_REVERSAL' lewat
      // opts supaya findActiveMovements() bisa membedakan movement yang
      // sudah dibalik revisi vs. yang masih aktif.
      sourceType: opts?.reversalSourceType ?? 'VOID_REVERSAL',
      sourceId: movement.id,
      // Default hari ini (perilaku VOID TIDAK berubah, §2.2) — revisi (K2)
      // mengisi tanggal dokumen ASLI lewat opts.movementDate supaya rekap
      // kas/stok harian tetap cocok dengan nota fisik.
      movementDate: toDateOnlyString(opts?.movementDate ?? new Date()),
      createdBy: userId,
    });
    const savedReversal = await manager.save(StockMovement, reversal);

    await this.upsertBalance(
      movement.productId,
      movement.warehouseId,
      -totalQtyIn,
      manager,
    );

    return savedReversal;
  }

  /**
   * Membalik satu movement KELUAR (mis. hasil recordOut dari penjualan) —
   * dipanggil VoidEngineService (Hari 11). Mengembalikan qty_remaining
   * PERSIS ke lot asal sesuai stock_cost_consumptions (bukan lot baru
   * berharga rata-rata), supaya jejak FIFO tetap akurat. Porsi shortfall
   * (stok sempat minus, tidak ada lot nyata) tidak punya baris konsumsi —
   * dipulihkan lewat balance saja.
   */
  async reverseOut(
    movementId: string,
    userId: string,
    manager: EntityManager,
    opts?: ReverseOpts,
  ): Promise<StockMovement> {
    const movement = await manager.findOne(StockMovement, {
      where: { id: movementId },
    });
    if (!movement) {
      throw new BadRequestException(
        'Movement stok untuk dibalik tidak ditemukan.',
      );
    }
    if (Number(movement.qtyBaseUnit) >= 0) {
      throw new BadRequestException(
        'reverseOut hanya berlaku untuk movement keluar (qty_base_unit negatif).',
      );
    }
    if (movement.movementType === StockMovementType.TRANSFER) {
      throw new BadRequestException(
        'VOID untuk mutasi gudang (transfer) belum didukung — akan dikerjakan Hari 13.',
      );
    }

    const consumptions: { lot_id: string; qty: string }[] = await manager.query(
      `SELECT lot_id, qty FROM stock_cost_consumptions WHERE movement_id = $1`,
      [movement.id],
    );
    if (consumptions.length > 0) {
      const lotIds = consumptions.map((c) => c.lot_id);
      // Kunci baris lot dulu (pola sama consumeFifo) sebelum diupdate,
      // supaya tidak tumpang tindih dengan recordOut/reverseOut lain yang
      // sedang berjalan atas lot yang sama.
      await manager.query(
        `SELECT id FROM stock_cost_lots WHERE id = ANY($1) FOR UPDATE`,
        [lotIds],
      );
      for (const consumption of consumptions) {
        await manager.query(
          `UPDATE stock_cost_lots SET qty_remaining = qty_remaining + $1 WHERE id = $2`,
          [consumption.qty, consumption.lot_id],
        );
      }
    }

    const totalQtyOut = Math.abs(Number(movement.qtyBaseUnit));

    const reversal = manager.create(StockMovement, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      movementType: StockMovementType.ADJUSTMENT,
      qtyBaseUnit: totalQtyOut.toFixed(4),
      unitCost: movement.unitCost,
      // Lihat catatan di reverseIn() — default sama, opts sama.
      sourceType: opts?.reversalSourceType ?? 'VOID_REVERSAL',
      sourceId: movement.id,
      movementDate: toDateOnlyString(opts?.movementDate ?? new Date()),
      createdBy: userId,
    });
    const savedReversal = await manager.save(StockMovement, reversal);

    await this.upsertBalance(
      movement.productId,
      movement.warehouseId,
      totalQtyOut,
      manager,
    );

    return savedReversal;
  }

  /**
   * unit_cost lot TERBARU yang unit_cost > 0 — lot bonus berharga nol WAJIB
   * dilewati (CLAUDE.md §2.8, §2.17, §3). Dipakai fallback stok minus di
   * atas DAN batas jual di bawah harga pokok (Hari 21) — satu fungsi
   * bersama, jangan diduplikasi. Tidak dibatasi warehouse: basis biaya
   * produk mengikuti riwayat pembelian aslinya (selalu masuk ke STORE),
   * bukan gudang tempat stok sedang berada.
   */
  async getLatestCostBasis(
    productId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const rows: { unit_cost: string }[] = await runner.query(
      `SELECT unit_cost FROM stock_cost_lots
       WHERE product_id = $1 AND unit_cost > 0
       ORDER BY lot_date DESC, id DESC
       LIMIT 1`,
      [productId],
    );
    return rows[0] ? Number(rows[0].unit_cost) : 0;
  }

  /**
   * Dipakai gerbang edit/VOID/revisi dokumen (mis.
   * PurchaseInvoiceVoidHook.checkVoidable, DocumentReviseService paket R6)
   * sebagai pengecekan level-DOKUMEN (seluruh lot AKTIF sekaligus) sebelum
   * jurnal/transaction lain disentuh. Disempitkan ke lot milik movement AKTIF
   * saja (lihat findActiveMovements()) — bukan lagi seluruh lot ber-
   * source_type/source_id dokumen ini, supaya lot posting LAMA yang sudah
   * dibalik revisi sebelumnya (qty_remaining=0, memang disengaja) tidak
   * dibaca sebagai "barang sudah terjual". predikatnya sendiri identik
   * dengan pengecekan per-movement di reverseIn (qty_remaining harus sama
   * persis dengan qty_in) — reverseIn tetap jadi jaring pengaman kalau ada
   * pemanggil lain di masa depan yang lewat hook ini.
   */
  async assertLotsUnconsumed(
    sourceType: string,
    sourceId: string,
    manager: EntityManager,
    message: string,
  ): Promise<void> {
    const activeMovementIds = await this.findActiveMovementIds(
      sourceType,
      sourceId,
      manager,
    );
    if (activeMovementIds.length === 0) {
      return;
    }
    const lots: { qty_in: string; qty_remaining: string }[] =
      await manager.query(
        `SELECT qty_in, qty_remaining FROM stock_cost_lots WHERE movement_id = ANY($1)`,
        [activeMovementIds],
      );
    const consumed = lots.some(
      (lot) => Number(lot.qty_remaining) !== Number(lot.qty_in),
    );
    if (consumed) {
      throw new BadRequestException(message);
    }
  }

  /**
   * Movement AKTIF (belum dibalik VOID maupun revisi) untuk satu
   * sourceType+sourceId — dipakai VoidEngineService DAN DocumentReviseService
   * (paket R6) sebagai pengganti `manager.find(StockMovement, {where:
   * {sourceType, sourceId}})` polos. Sebelum revisi ada, query polos itu
   * selalu benar (satu dokumen = satu ronde posting). Begitu dokumen bisa
   * diposting ulang (revisi in-place), query polos akan ikut menangkap
   * movement RONDE LAMA yang sudah dibalik — membalik dua kali movement yang
   * sama, atau (untuk reverseIn) salah mengira lot lama yang sudah nol
   * sebagai "sudah terjual". "Aktif" didefinisikan sebagai: belum ada
   * movement ADJUSTMENT lain yang source_id-nya menunjuk movement ini —
   * itulah bentuk reversal SATU-SATUNYA yang reverseIn/reverseOut buat,
   * dari VOID maupun revisi, jadi tidak perlu enumerasi sourceType reversal.
   */
  async findActiveMovements(
    sourceType: string,
    sourceId: string,
    manager: EntityManager,
  ): Promise<StockMovement[]> {
    const ids = await this.findActiveMovementIds(sourceType, sourceId, manager);
    if (ids.length === 0) {
      return [];
    }
    return manager.find(StockMovement, { where: { id: In(ids) } });
  }

  private async findActiveMovementIds(
    sourceType: string,
    sourceId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const rows: { id: string }[] = await manager.query(
      `SELECT m.id FROM stock_movements m
       WHERE m.source_type = $1 AND m.source_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM stock_movements r
           WHERE r.movement_type = 'adjustment' AND r.source_id = m.id
         )`,
      [sourceType, sourceId],
    );
    return rows.map((row) => row.id);
  }

  async reconcile(
    filter: ReconcileFilter = {},
    manager?: EntityManager,
  ): Promise<ReconcileRow[]> {
    const runner = manager ?? this.dataSource.manager;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.productId) {
      params.push(filter.productId);
      conditions.push(`m.product_id = $${params.length}`);
    }
    if (filter.warehouseId) {
      params.push(filter.warehouseId);
      conditions.push(`m.warehouse_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows: {
      product_id: string;
      warehouse_id: string;
      movement_sum: string;
      balance_qty: string | null;
    }[] = await runner.query(
      `SELECT m.product_id, m.warehouse_id,
              SUM(m.qty_base_unit) AS movement_sum,
              b.qty_base_unit AS balance_qty
       FROM stock_movements m
       LEFT JOIN product_stock_balance b
         ON b.product_id = m.product_id AND b.warehouse_id = m.warehouse_id
       ${where}
       GROUP BY m.product_id, m.warehouse_id, b.qty_base_unit`,
      params,
    );

    return rows.map((row) => {
      const movementSum = Number(row.movement_sum);
      const balanceQty = row.balance_qty !== null ? Number(row.balance_qty) : 0;
      return {
        productId: row.product_id,
        warehouseId: row.warehouse_id,
        movementSum,
        balanceQty,
        difference: Number((balanceQty - movementSum).toFixed(4)),
      };
    });
  }

  /** "12 DUS 15 RENCENG" — konversi satu tingkat (CLAUDE.md §3). */
  async formatQtyBreakdown(
    qtyBaseUnit: number,
    productId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const runner = manager ?? this.dataSource.manager;
    const product = await runner.findOne(Product, {
      where: { id: productId },
      relations: { unitConversions: true },
    });
    if (!product) {
      throw new BadRequestException(
        'Produk tidak ditemukan untuk formatQtyBreakdown.',
      );
    }
    const conversions = product.unitConversions.map((c) => ({
      unitName: c.unitName,
      qtyInBaseUnit: Number(c.qtyInBaseUnit),
    }));
    return computeQtyBreakdown(qtyBaseUnit, product.baseUnit, conversions);
  }

  /**
   * FOR UPDATE WAJIB, bukan opsional (CLAUDE.md §2.7) — tanpa row-lock ini
   * dua transaksi paralel atas produk+gudang yang sama bisa membaca
   * qty_remaining yang sama sebelum salah satu meng-UPDATE-nya, dan
   * merusak FIFO (konsumsi tumpang tindih/lot terkonsumsi ganda).
   */
  private async consumeFifo(
    productId: string,
    warehouseId: string,
    qtyNeeded: number,
    manager: EntityManager,
    supplierId?: string,
  ): Promise<FifoConsumeResult> {
    const params: unknown[] = [productId, warehouseId];
    let supplierFilter = '';
    if (supplierId) {
      params.push(supplierId);
      supplierFilter = ` AND supplier_id = $${params.length}`;
    }
    const lots: {
      id: string;
      lot_date: string;
      qty_remaining: string;
      unit_cost: string;
      supplier_id: string | null;
    }[] = await manager.query(
      `SELECT id, lot_date, qty_remaining, unit_cost, supplier_id
       FROM stock_cost_lots
       WHERE product_id = $1 AND warehouse_id = $2 AND qty_remaining > 0${supplierFilter}
       ORDER BY lot_date ASC, id ASC
       FOR UPDATE`,
      params,
    );

    let remaining = qtyNeeded;
    let totalCost = 0;
    const portions: FifoPortion[] = [];

    for (const lot of lots) {
      if (remaining <= 0) break;
      const lotQtyRemaining = Number(lot.qty_remaining);
      const take = Math.min(remaining, lotQtyRemaining);
      if (take <= 0) continue;

      const unitCost = Number(lot.unit_cost);
      portions.push({
        lotId: lot.id,
        qty: take,
        unitCost,
        supplierId: lot.supplier_id,
        lotDate: lot.lot_date,
      });
      totalCost += take * unitCost;
      remaining = Number((remaining - take).toFixed(4));

      await manager.query(
        `UPDATE stock_cost_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2`,
        [take.toFixed(4), lot.id],
      );
    }

    return { portions, totalCost, shortfallQty: remaining };
  }

  private async saveConsumptions(
    portions: FifoPortion[],
    movementId: string,
    manager: EntityManager,
  ): Promise<StockCostConsumption[]> {
    const consumptions: StockCostConsumption[] = [];
    for (const portion of portions) {
      const consumption = manager.create(StockCostConsumption, {
        lotId: portion.lotId,
        movementId,
        qty: portion.qty.toFixed(4),
        unitCost: portion.unitCost.toFixed(4),
      });
      consumptions.push(await manager.save(StockCostConsumption, consumption));
    }
    return consumptions;
  }

  /**
   * INSERT ... ON CONFLICT DO UPDATE dengan aritmetika di sisi SQL bersifat
   * atomic di Postgres — tidak butuh SELECT FOR UPDATE terpisah dulu (pola
   * sama DocumentCounterService, tapi UPSERT di sini tidak punya masalah
   * "baris belum ada" karena ON CONFLICT DO NOTHING/DO UPDATE menangani
   * keduanya dalam satu statement).
   */
  private async upsertBalance(
    productId: string,
    warehouseId: string,
    deltaQty: number,
    manager: EntityManager,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO product_stock_balance (product_id, warehouse_id, qty_base_unit)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET qty_base_unit = product_stock_balance.qty_base_unit + $3`,
      [productId, warehouseId, deltaQty.toFixed(4)],
    );
  }

  private async buildStockWarningIfNegative(
    productId: string,
    warehouseId: string,
    manager: EntityManager,
  ): Promise<string | undefined> {
    const rows: { qty_base_unit: string }[] = await manager.query(
      `SELECT qty_base_unit FROM product_stock_balance WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, warehouseId],
    );
    const balance = rows[0] ? Number(rows[0].qty_base_unit) : 0;
    if (balance >= 0) {
      return undefined;
    }

    const product = await manager.findOne(Product, {
      where: { id: productId },
    });
    const warehouse = await manager.findOne(Warehouse, {
      where: { id: warehouseId },
    });
    const productName = product?.displayName ?? productId;
    const warehouseName = warehouse?.name ?? warehouseId;
    const baseUnit = product?.baseUnit ?? '';

    return `Stok ${productName} di ${warehouseName} minus ${Math.abs(balance)} ${baseUnit}`.trim();
  }
}

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
