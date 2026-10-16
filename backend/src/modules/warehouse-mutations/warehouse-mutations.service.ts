import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { ActionType } from '../authorization-requests/action-type.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Customer } from '../customers/entities/customer.entity';
import { SalesInvoiceLine } from '../sales-invoices/entities/sales-invoice-line.entity';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import {
  Warehouse,
  WarehouseType,
} from '../warehouses/entities/warehouse.entity';
import { CreateWarehouseMutationDto } from './dto/create-warehouse-mutation.dto';
import { WarehouseMutationQueryDto } from './dto/warehouse-mutation-query.dto';
import { WarehouseMutationLine } from './entities/warehouse-mutation-line.entity';
import {
  WarehouseMutation,
  WarehouseMutationPostingStatus,
  WarehouseMutationPrintStatus,
  WarehouseMutationType,
} from './entities/warehouse-mutation.entity';

const SORTABLE_COLUMNS = [
  'mutationNumber',
  'mutationDate',
  'createdAt',
] as const;

export interface CreateResult {
  mutation: WarehouseMutation;
  lines: WarehouseMutationLine[];
  stockWarnings: string[];
}

export interface TitipanFakturOption {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
}

export interface TitipanFakturLineOption {
  id: string;
  productId: string;
  qtyBaseUnit: number;
  alreadyTitipanQtyBaseUnit: number;
  remainingQtyBaseUnit: number;
}

/**
 * Orkestrasi 3 cabang mutasi gudang (CLAUDE.md §3 "Mutasi gudang", §2.5) di
 * atas primitif yang SUDAH ADA — StockRecorderService.transfer() (FIFO +
 * lot ikut pindah ber-unit_cost sama, tanpa jurnal) dan StepUpService
 * (otorisasi BS->STORE). Modul ini TIDAK PERNAH menulis stock_movements
 * sendiri — hanya memanggil transfer() untuk cabang B/C, dan sama sekali
 * tidak memanggilnya untuk cabang A (titipan, barangnya bukan milik toko
 * lagi — CLAUDE.md §3 "Gudang").
 */
@Injectable()
export class WarehouseMutationsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    @InjectRepository(WarehouseMutation)
    private readonly mutationsRepository: Repository<WarehouseMutation>,
    private readonly stockRecorderService: StockRecorderService,
    private readonly documentCounterService: DocumentCounterService,
    private readonly periodLockValidatorService: PeriodLockValidatorService,
    private readonly stepUpService: StepUpService,
  ) {}

  async create(
    dto: CreateWarehouseMutationDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<CreateResult> {
    const hasCustomer = !!dto.customerId;
    const hasToWarehouse = !!dto.toWarehouseId;
    if (hasCustomer === hasToWarehouse) {
      throw new BadRequestException(
        'Isi persis satu dari customerId (mutasi titipan) atau toWarehouseId (mutasi STORE<->BAD_STOCK).',
      );
    }
    // Diperiksa juga di sini (bukan hanya @ValidateIf di DTO) — pola sama
    // pemeriksaan di atas, supaya pemanggil yang melewati ValidationPipe
    // (mis. test yang memanggil service langsung) tetap mendapat 400, bukan
    // findOne(undefined) yang perilakunya tidak jelas (paket R8 keputusan K7).
    if (hasCustomer && !dto.salesInvoiceId) {
      throw new BadRequestException(
        'salesInvoiceId wajib untuk mutasi titipan pelanggan.',
      );
    }

    const mutationDate = dto.mutationDate
      ? parseDateOnly(dto.mutationDate)
      : startOfUtcToday();
    const fromWarehouse = await this.resolveFromWarehouse(dto.fromWarehouseId);

    if (hasCustomer) {
      return this.dataSource.transaction(async (manager) => {
        await this.periodLockValidatorService.validate(mutationDate, manager);
        return this.processTitipan(
          dto,
          user,
          fromWarehouse,
          mutationDate,
          manager,
        );
      });
    }

    // Cabang B/C — tentukan arah dari tipe gudang asal/tujuan SEBELUM
    // menyentuh transaction apa pun, supaya kombinasi tidak valid ditolak
    // murah (tanpa membuka transaction, tanpa membakar nomor GD).
    const toWarehouse = await this.findWarehouseOrThrow(dto.toWarehouseId!);
    const direction = this.resolveTransferDirection(fromWarehouse, toWarehouse);

    if (direction === 'BS_TO_STORE' && !authorizationRequestId) {
      // WAJIB tanpa `manager` — kalau dipanggil di dalam transaction dokumen,
      // baris authorization_requests yang baru dibuat ikut ter-rollback saat
      // 412 ini dilempar, padahal baris itu justru harus tetap ada supaya
      // Supervisor bisa menyetujuinya nanti.
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.BS_TO_STORE,
        payload: this.buildApprovalPayload(
          dto,
          fromWarehouse.id,
          toWarehouse.id,
        ),
        contextSummary: this.buildContextSummary(
          dto,
          fromWarehouse,
          toWarehouse,
        ),
      });
    }

    return this.dataSource.transaction(async (manager) => {
      await this.periodLockValidatorService.validate(mutationDate, manager);

      if (direction === 'BS_TO_STORE') {
        // Konsumsi approval ATOMIC dengan penulisan dokumen — gagal di
        // tengah (mis. produk tidak ditemukan di baris kedua) berarti
        // approval tetap APPROVED dan bisa dipakai ulang (CLAUDE.md §19).
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.BS_TO_STORE,
          payload: this.buildApprovalPayload(
            dto,
            fromWarehouse.id,
            toWarehouse.id,
          ),
          contextSummary: this.buildContextSummary(
            dto,
            fromWarehouse,
            toWarehouse,
          ),
          authorizationRequestId,
          manager,
        });
      }

      return this.processTransfer(
        dto,
        user,
        fromWarehouse,
        toWarehouse,
        mutationDate,
        manager,
      );
    });
  }

  async findAll(
    query: WarehouseMutationQueryDto,
  ): Promise<PaginatedResult<WarehouseMutation>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'mutationDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.mutationsRepository.createQueryBuilder('mutation');
    if (query.search) {
      qb.andWhere('mutation.mutationNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.mutationType) {
      qb.andWhere('mutation.mutationType = :type', {
        type: query.mutationType,
      });
    }

    qb.orderBy(`mutation.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<WarehouseMutation> {
    const mutation = await this.mutationsRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!mutation) {
      throw new BadRequestException('Mutasi gudang tidak ditemukan.');
    }
    return mutation;
  }

  /**
   * Faktur POSTED milik pelanggan ini yang MASIH punya sisa qty belum
   * dititip di minimal satu barisnya (paket R8 K7) — dipakai layar Entri
   * Mutasi Titipan (gudang/mutasi/index.vue) supaya operator hanya melihat
   * faktur yang relevan, bukan seluruh riwayat pembelian pelanggan.
   */
  async findTitipanFakturForCustomer(
    customerId: string,
  ): Promise<TitipanFakturOption[]> {
    return this.dataSource.manager.query(
      `SELECT si.id, si.invoice_number AS "invoiceNumber", si.invoice_date::text AS "invoiceDate"
         FROM sales_invoices si
         JOIN sales_invoice_lines sil ON sil.sales_invoice_id = si.id
         LEFT JOIN (
           SELECT wml.sales_invoice_line_id, SUM(wml.qty_base_unit) AS titipan_qty
             FROM warehouse_mutation_lines wml
             JOIN warehouse_mutations wm ON wm.id = wml.mutation_id
            WHERE wm.mutation_type = 'TITIPAN_PELANGGAN' AND wm.posting_status = 'POSTED'
            GROUP BY wml.sales_invoice_line_id
         ) t ON t.sales_invoice_line_id = sil.id
        WHERE si.customer_id = $1
          AND si.posting_status = 'POSTED'
          AND sil.qty_base_unit > COALESCE(t.titipan_qty, 0)
        GROUP BY si.id, si.invoice_number, si.invoice_date
        ORDER BY si.invoice_date DESC, si.invoice_number DESC`,
      [customerId],
    );
  }

  /**
   * Baris faktur + qty sudah dititip + sisa yang boleh dititip, untuk SATU
   * faktur (dipilih dari findTitipanFakturForCustomer() di atas) — operator
   * memilih baris titipan dari sini, bukan dari master produk (paket R8 K7).
   * Angka "sisa" di sini HARUS dihitung dengan query yang SAMA dengan
   * assertTitipanQtyWithinInvoiceLine() di bawah, supaya FE tidak pernah
   * menampilkan sisa yang berbeda dari yang sungguh divalidasi saat submit.
   */
  async findTitipanFakturLines(
    salesInvoiceId: string,
  ): Promise<TitipanFakturLineOption[]> {
    const rows: {
      id: string;
      product_id: string;
      qty_base_unit: string;
      already_titipan_qty_base_unit: string;
    }[] = await this.dataSource.manager.query(
      `SELECT sil.id, sil.product_id, sil.qty_base_unit,
              COALESCE(t.titipan_qty, 0) AS already_titipan_qty_base_unit
         FROM sales_invoice_lines sil
         LEFT JOIN (
           SELECT wml.sales_invoice_line_id, SUM(wml.qty_base_unit) AS titipan_qty
             FROM warehouse_mutation_lines wml
             JOIN warehouse_mutations wm ON wm.id = wml.mutation_id
            WHERE wm.mutation_type = 'TITIPAN_PELANGGAN' AND wm.posting_status = 'POSTED'
            GROUP BY wml.sales_invoice_line_id
         ) t ON t.sales_invoice_line_id = sil.id
        WHERE sil.sales_invoice_id = $1
        ORDER BY sil.line_order`,
      [salesInvoiceId],
    );
    return rows.map((r) => {
      const qtyBaseUnit = Number(r.qty_base_unit);
      const alreadyTitipanQtyBaseUnit = Number(r.already_titipan_qty_base_unit);
      return {
        id: r.id,
        productId: r.product_id,
        qtyBaseUnit,
        alreadyTitipanQtyBaseUnit,
        remainingQtyBaseUnit: qtyBaseUnit - alreadyTitipanQtyBaseUnit,
      };
    });
  }

  // --- Cabang A: TITIPAN_PELANGGAN ------------------------------------

  private async processTitipan(
    dto: CreateWarehouseMutationDto,
    user: AuthenticatedUser,
    fromWarehouse: Warehouse,
    mutationDate: Date,
    manager: EntityManager,
  ): Promise<CreateResult> {
    const customer = await manager.findOne(Customer, {
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new BadRequestException(
        `Pelanggan ${dto.customerId} tidak ditemukan.`,
      );
    }

    // WAJIB untuk cabang titipan (paket R8 keputusan K7) — DTO sudah
    // menolak 400 lewat @ValidateIf kalau kosong; di sini divalidasi bahwa
    // fakturnya sungguh ada, milik pelanggan ini, dan belum VOID.
    const invoice = await manager.findOne(SalesInvoice, {
      where: { id: dto.salesInvoiceId },
    });
    if (!invoice) {
      throw new BadRequestException(
        `Faktur penjualan ${dto.salesInvoiceId} tidak ditemukan.`,
      );
    }
    if (invoice.customerId !== customer.id) {
      throw new BadRequestException(
        `Faktur ${invoice.invoiceNumber} bukan milik pelanggan ${customer.name}.`,
      );
    }
    if (invoice.postingStatus === SalesInvoicePostingStatus.VOIDED) {
      throw new BadRequestException(
        `Faktur ${invoice.invoiceNumber} sudah dibatalkan (VOID), tidak bisa dipakai untuk mutasi titipan.`,
      );
    }

    const titipanWarehouse = await this.getOrCreateTitipanWarehouse(
      customer,
      manager,
    );

    const mutationNumber = await this.documentCounterService.getNextNumber(
      'WAREHOUSE_MUTATION',
      mutationDate,
      manager,
    );
    const mutation = await manager.save(
      WarehouseMutation,
      manager.create(WarehouseMutation, {
        mutationNumber,
        mutationDate: toDateOnlyString(mutationDate),
        mutationType: WarehouseMutationType.TITIPAN_PELANGGAN,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: titipanWarehouse.id,
        salesInvoiceId: invoice.id,
        notes: dto.notes ?? null,
        postingStatus: WarehouseMutationPostingStatus.POSTED,
        printStatus: WarehouseMutationPrintStatus.NOT_PRINTED,
        createdBy: user.sub,
      }),
    );

    const lines: WarehouseMutationLine[] = [];
    let lineOrder = 1;
    for (const lineDto of dto.lines) {
      if (!lineDto.salesInvoiceLineId) {
        throw new BadRequestException(
          'salesInvoiceLineId wajib untuk tiap baris mutasi titipan.',
        );
      }
      const invoiceLine = await manager.findOne(SalesInvoiceLine, {
        where: { id: lineDto.salesInvoiceLineId },
      });
      if (!invoiceLine || invoiceLine.salesInvoiceId !== invoice.id) {
        throw new BadRequestException(
          `Baris faktur ${lineDto.salesInvoiceLineId} tidak ditemukan pada faktur ${invoice.invoiceNumber}.`,
        );
      }
      if (invoiceLine.productId !== lineDto.productId) {
        throw new BadRequestException(
          `Produk baris titipan tidak cocok dengan baris pada faktur ${invoice.invoiceNumber}.`,
        );
      }
      // Kuota per BARIS FAKTUR (paket R8 keputusan K7), bukan lagi per
      // produk lintas faktur — lihat docstring assertTitipanQtyWithinInvoiceLine().
      await this.assertTitipanQtyWithinInvoiceLine(
        invoiceLine,
        invoice.invoiceNumber,
        lineDto.qtyBaseUnit,
        manager,
      );
      const line = await manager.save(
        WarehouseMutationLine,
        manager.create(WarehouseMutationLine, {
          mutationId: mutation.id,
          lineOrder: lineOrder++,
          productId: lineDto.productId,
          salesInvoiceLineId: invoiceLine.id,
          qtyBaseUnit: lineDto.qtyBaseUnit.toFixed(4),
          unitCost: null,
          movementOutId: null,
          movementInId: null,
        }),
      );
      lines.push(line);
    }

    // Sengaja TIDAK memanggil stockRecorderService di sini sama sekali —
    // barang titipan bukan lagi milik toko (CLAUDE.md §3), jadi tidak boleh
    // ada stock_movements/lot/jurnal untuk cabang ini.
    return { mutation, lines, stockWarnings: [] };
  }

  /**
   * Qty kumulatif titipan (mutasi POSTED sebelumnya + baris yang sedang
   * ditambahkan ini) tidak boleh melebihi qty pada BARIS FAKTUR itu sendiri
   * (paket R8, docs/RENCANA_REVISI_TESTING_KLIEN.md §2A K7 — menggantikan
   * assertTitipanQtyWithinPurchased() yang menjumlah per produk lintas
   * semua faktur, dan karena itu salah membiarkan titipan atas satu faktur
   * "menghabiskan" kuota faktur lain untuk produk yang sama).
   * Retur penjualan SENGAJA tidak mengurangi qty baris faktur di sini —
   * simplifikasi yang disengaja, bukan celah: retur pelanggan selalu masuk
   * BAD_STOCK terpisah (CLAUDE.md §3 "Bad stock"), tidak pernah memotong
   * barang yang sudah dititipkan.
   */
  private async assertTitipanQtyWithinInvoiceLine(
    invoiceLine: SalesInvoiceLine,
    invoiceNumber: string,
    newQtyBaseUnit: number,
    manager: EntityManager,
  ): Promise<void> {
    const titipanRows: { already_titipan: string | null }[] =
      await manager.query(
        `SELECT SUM(wml.qty_base_unit) AS already_titipan
           FROM warehouse_mutation_lines wml
           JOIN warehouse_mutations wm ON wm.id = wml.mutation_id
          WHERE wml.sales_invoice_line_id = $1
            AND wm.mutation_type = 'TITIPAN_PELANGGAN'
            AND wm.posting_status = 'POSTED'`,
        [invoiceLine.id],
      );
    const alreadyTitipanQty = Number(titipanRows[0]?.already_titipan ?? 0);
    const invoiceLineQty = Number(invoiceLine.qtyBaseUnit);

    if (alreadyTitipanQty + newQtyBaseUnit > invoiceLineQty) {
      throw new BadRequestException(
        `Qty titipan melebihi qty pada baris faktur ${invoiceNumber} (qty faktur: ${invoiceLineQty}, sudah dititip: ${alreadyTitipanQty}, diminta: ${newQtyBaseUnit}).`,
      );
    }
  }

  private async getOrCreateTitipanWarehouse(
    customer: Customer,
    manager: EntityManager,
  ): Promise<Warehouse> {
    const existing = await manager.findOne(Warehouse, {
      where: {
        warehouseType: WarehouseType.TITIPAN_PELANGGAN,
        customerId: customer.id,
      },
    });
    if (existing) {
      return existing;
    }
    // Dibuat langsung lewat manager (BUKAN WarehousesService.create(), yang
    // membuka transaction sendiri lewat this.dataSource.transaction() dan
    // tidak bisa dipanggil dari dalam transaction ini tanpa memecah
    // atomicity dokumen).
    return manager.save(
      Warehouse,
      manager.create(Warehouse, {
        name: `Titipan Pelanggan - ${customer.name}`,
        warehouseType: WarehouseType.TITIPAN_PELANGGAN,
        customerId: customer.id,
        isDefault: false,
        isActive: true,
      }),
    );
  }

  // --- Cabang B/C: STORE <-> BAD_STOCK ---------------------------------

  private async processTransfer(
    dto: CreateWarehouseMutationDto,
    user: AuthenticatedUser,
    fromWarehouse: Warehouse,
    toWarehouse: Warehouse,
    mutationDate: Date,
    manager: EntityManager,
  ): Promise<CreateResult> {
    const mutationNumber = await this.documentCounterService.getNextNumber(
      'WAREHOUSE_MUTATION',
      mutationDate,
      manager,
    );
    const mutation = await manager.save(
      WarehouseMutation,
      manager.create(WarehouseMutation, {
        mutationNumber,
        mutationDate: toDateOnlyString(mutationDate),
        mutationType: WarehouseMutationType.TRANSFER,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        notes: dto.notes ?? null,
        postingStatus: WarehouseMutationPostingStatus.POSTED,
        printStatus: WarehouseMutationPrintStatus.NOT_PRINTED,
        createdBy: user.sub,
      }),
    );

    const lines: WarehouseMutationLine[] = [];
    const stockWarnings: string[] = [];
    let lineOrder = 1;
    for (const lineDto of dto.lines) {
      const result = await this.stockRecorderService.transfer(
        {
          productId: lineDto.productId,
          fromWarehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          qtyBaseUnit: lineDto.qtyBaseUnit,
          movementDate: mutationDate,
          sourceType: 'WAREHOUSE_MUTATION',
          sourceId: mutation.id,
          createdBy: user.sub,
        },
        manager,
      );
      if (result.stockWarning) {
        stockWarnings.push(result.stockWarning);
      }

      const line = await manager.save(
        WarehouseMutationLine,
        manager.create(WarehouseMutationLine, {
          mutationId: mutation.id,
          lineOrder: lineOrder++,
          productId: lineDto.productId,
          qtyBaseUnit: lineDto.qtyBaseUnit.toFixed(4),
          // unit_cost HANYA dari hasil transfer() — tidak pernah dari body
          // request (DTO tidak punya field ini sama sekali).
          unitCost: result.movementIn.unitCost,
          movementOutId: result.movementOut.id,
          movementInId: result.movementIn.id,
        }),
      );
      lines.push(line);
    }

    return { mutation, lines, stockWarnings };
  }

  // --- Helper ------------------------------------------------------------

  private resolveTransferDirection(
    fromWarehouse: Warehouse,
    toWarehouse: Warehouse,
  ): 'STORE_TO_BS' | 'BS_TO_STORE' {
    if (
      fromWarehouse.warehouseType === WarehouseType.STORE &&
      toWarehouse.warehouseType === WarehouseType.BAD_STOCK
    ) {
      return 'STORE_TO_BS';
    }
    if (
      fromWarehouse.warehouseType === WarehouseType.BAD_STOCK &&
      toWarehouse.warehouseType === WarehouseType.STORE
    ) {
      return 'BS_TO_STORE';
    }
    throw new BadRequestException(
      'Kombinasi gudang asal/tujuan tidak valid untuk mutasi. Hanya STORE<->BAD_STOCK yang didukung lewat toWarehouseId (pakai customerId untuk mutasi titipan pelanggan).',
    );
  }

  private buildApprovalPayload(
    dto: CreateWarehouseMutationDto,
    fromWarehouseId: string,
    toWarehouseId: string,
  ): Record<string, unknown> {
    return {
      fromWarehouseId,
      toWarehouseId,
      lines: dto.lines.map((line) => ({
        productId: line.productId,
        qtyBaseUnit: line.qtyBaseUnit,
      })),
    };
  }

  private buildContextSummary(
    dto: CreateWarehouseMutationDto,
    fromWarehouse: Warehouse,
    toWarehouse: Warehouse,
  ): string {
    const totalQty = dto.lines.reduce((sum, line) => sum + line.qtyBaseUnit, 0);
    return `Mutasi Gudang ${fromWarehouse.name} -> ${toWarehouse.name}: ${dto.lines.length} produk, total qty ${totalQty}`;
  }

  private async resolveFromWarehouse(
    fromWarehouseId: string | undefined,
  ): Promise<Warehouse> {
    if (fromWarehouseId) {
      return this.findWarehouseOrThrow(fromWarehouseId);
    }
    // CLAUDE.md §3 "Gudang": "Lokasi selalu default STORE".
    const defaultStore = await this.warehousesRepository.findOne({
      where: {
        warehouseType: WarehouseType.STORE,
        isDefault: true,
        isActive: true,
      },
    });
    if (defaultStore) {
      return defaultStore;
    }
    const anyStore = await this.warehousesRepository.findOne({
      where: { warehouseType: WarehouseType.STORE, isActive: true },
    });
    if (!anyStore) {
      throw new BadRequestException(
        'Gudang STORE aktif tidak ditemukan — periksa data gudang sebelum membuat mutasi.',
      );
    }
    return anyStore;
  }

  private async findWarehouseOrThrow(id: string): Promise<Warehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { id },
    });
    if (!warehouse) {
      throw new BadRequestException(`Gudang ${id} tidak ditemukan.`);
    }
    return warehouse;
  }
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

function toDateOnlyString(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
