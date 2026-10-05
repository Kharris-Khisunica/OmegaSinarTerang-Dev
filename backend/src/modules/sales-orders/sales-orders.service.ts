import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { CreateSalesOrderLineDto } from './dto/create-sales-order-line.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesOrder, SalesOrderStatus } from './entities/sales-order.entity';

const SORTABLE_COLUMNS = ['orderNumber', 'orderDate', 'createdAt'] as const;

interface LineContext {
  dto: CreateSalesOrderLineDto;
  product: Product;
  unit: Unit;
  qtyBaseUnit: number;
}

export interface CreateSalesOrderResult {
  salesOrder: SalesOrder;
  lines: SalesOrderLine[];
}

/**
 * Sales Order (CLAUDE.md §8: satu-satunya modul di daftar potong yang TIDAK
 * BOLEH dipotong — sistem lama 0 record, order selama ini ditulis di
 * kertas). Constructor SENGAJA lean — tidak ada StockRecorderService,
 * JournalPosterService, PrintLockService, atau VoidEngineService — ini
 * pembuktian struktural (bukan cuma komentar) bahwa SO tidak menyentuh
 * stok/uang/cetak/VOID (CLAUDE.md §2.16, §3 "Sales Order tidak menahan
 * stok").
 *
 * assertChannelSalesOrderRequirement() dan markConverted() adalah primitif
 * publik yang dibangun SEBELUM pemanggil produksinya ada — sales_invoices
 * baru tabelnya Hari 20, endpoint penuhnya Hari 21 — pola persis
 * ProductsService.lockCode() (Hari 8). Hari 21 akan memanggil keduanya dari
 * DALAM transaction-nya sendiri.
 */
@Injectable()
export class SalesOrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(SalesOrder)
    private readonly salesOrdersRepository: Repository<SalesOrder>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly periodLockValidatorService: PeriodLockValidatorService,
  ) {}

  async create(
    dto: CreateSalesOrderDto,
    user: AuthenticatedUser,
  ): Promise<CreateSalesOrderResult> {
    const orderDate = parseDateOnly(dto.orderDate);

    return this.dataSource.transaction(async (manager) => {
      // SO tidak posting jurnal -> dipanggil langsung, bukan lewat
      // JournalPosterService.post() (pola sama WarehouseMutationsService).
      await this.periodLockValidatorService.validate(orderDate, manager);

      const customer = await manager.findOne(Customer, {
        where: { id: dto.customerId },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException(
          `Pelanggan ${dto.customerId} tidak ditemukan atau tidak aktif.`,
        );
      }

      const salesman = await this.resolveSalesman(dto.salesmanId, manager);

      const lineContexts = await this.resolveLineContexts(dto.lines, manager);

      // Dipanggil TERAKHIR, setelah semua validasi lolos — pola sama
      // PurchaseInvoicesService.create().
      const orderNumber = await this.documentCounterService.getNextNumber(
        'SALES_ORDER',
        orderDate,
        manager,
      );

      const order = await manager.save(
        SalesOrder,
        manager.create(SalesOrder, {
          orderNumber,
          orderDate: toDateOnlyString(orderDate),
          customerId: customer.id,
          salesmanId: salesman.id,
          status: SalesOrderStatus.OPEN,
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );

      const savedLines = await this.saveLines(order.id, lineContexts, manager);

      return { salesOrder: order, lines: savedLines };
    });
  }

  async findAll(
    query: SalesOrderQueryDto,
  ): Promise<PaginatedResult<SalesOrder>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'orderDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.salesOrdersRepository.createQueryBuilder('order');
    if (query.search) {
      qb.andWhere('order.orderNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.customerId) {
      qb.andWhere('order.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    qb.orderBy(`order.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<SalesOrder> {
    const order = await this.salesOrdersRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!order) {
      throw new BadRequestException('Sales Order tidak ditemukan.');
    }
    return order;
  }

  /**
   * SO belum mengikat stok/uang -> replace PENUH baris selama status OPEN
   * (beda dari purchase_invoice_lines yang append-only). Ditolak total
   * begitu CONVERTED, dicek SEBELUM transaction dibuka (short-circuit
   * murah, pola guard VOIDED di PurchaseInvoicesService.update()).
   */
  async update(id: string, dto: UpdateSalesOrderDto): Promise<SalesOrder> {
    const existing = await this.findOne(id);
    if (existing.status === SalesOrderStatus.CONVERTED) {
      throw new BadRequestException(
        'Sales Order ini sudah dikonversi menjadi faktur, tidak bisa diedit lagi.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const orderDate = dto.orderDate
        ? parseDateOnly(dto.orderDate)
        : parseDateOnly(existing.orderDate);
      if (dto.orderDate) {
        await this.periodLockValidatorService.validate(orderDate, manager);
      }

      const salesmanId = dto.salesmanId
        ? (await this.resolveSalesman(dto.salesmanId, manager)).id
        : existing.salesmanId;

      await manager.update(SalesOrder, id, {
        orderDate: toDateOnlyString(orderDate),
        salesmanId,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
      });

      if (dto.lines) {
        await manager.delete(SalesOrderLine, { salesOrderId: id });
        const lineContexts = await this.resolveLineContexts(dto.lines, manager);
        await this.saveLines(id, lineContexts, manager);
      }

      const updated = await manager.findOne(SalesOrder, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Sales Order tidak ditemukan.');
      }
      return updated;
    });
  }

  /**
   * CLAUDE.md §1 "Dua saluran penjualan": PENGIRIMAN wajib merujuk SO
   * terbuka milik pelanggan yang sama, TOKO tidak perlu SO sama sekali.
   * Method ini SENGAJA berdiri sendiri, diuji langsung tanpa tabel
   * sales_invoices (Hari 20/21) — lihat catatan kelas di atas. Urutan guard
   * (not-found -> status -> customer-match) supaya tiap alasan penolakan
   * bisa dibuktikan independen.
   */
  async assertChannelSalesOrderRequirement(
    channel: SalesChannel,
    salesOrderId: string | null,
    customerId: string,
    manager: EntityManager,
  ): Promise<void> {
    if (channel === SalesChannel.TOKO) {
      // No-op murni — TIDAK memvalidasi salesOrderId sekalipun dikirim
      // (CLAUDE.md §1: "TOKO tidak perlu Sales Order").
      return;
    }

    if (!salesOrderId) {
      throw new BadRequestException(
        'Saluran PENGIRIMAN wajib merujuk Sales Order — pilih SO terlebih dahulu.',
      );
    }

    const salesOrder = await manager.findOne(SalesOrder, {
      where: { id: salesOrderId },
    });
    if (!salesOrder) {
      throw new BadRequestException(
        `Sales Order ${salesOrderId} tidak ditemukan.`,
      );
    }
    if (salesOrder.status !== SalesOrderStatus.OPEN) {
      throw new BadRequestException(
        'Sales Order ini sudah dikonversi ke faktur sebelumnya, tidak bisa dipakai lagi.',
      );
    }
    if (salesOrder.customerId !== customerId) {
      throw new BadRequestException(
        'Sales Order ini milik pelanggan lain — tidak bisa dipakai untuk faktur pelanggan ini.',
      );
    }
  }

  /**
   * Titik transisi OPEN -> CONVERTED. Belum ada pemanggil produksi hari
   * ini — POST /sales-invoices (Hari 21) akan memanggil
   * assertChannelSalesOrderRequirement() lalu ini di DALAM transaction yang
   * sama. UPDATE ber-WHERE status='OPEN' (bukan findOne+save terpisah)
   * supaya dua transaction yang nyaris bersamaan mencoba mengonversi SO
   * yang sama tidak bisa keduanya sukses.
   */
  async markConverted(id: string, manager: EntityManager): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(SalesOrder)
      .set({ status: SalesOrderStatus.CONVERTED, convertedAt: () => 'now()' })
      .where('id = :id AND status = :status', {
        id,
        status: SalesOrderStatus.OPEN,
      })
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException(
        'Sales Order tidak bisa dikonversi — sudah dikonversi sebelumnya atau tidak ditemukan.',
      );
    }
  }

  // --- Helper --------------------------------------------------------------

  // PJ (penanggung jawab) SO — koreksi 02 Okt 2026. Pola validasi sama
  // SalesInvoicesService (findOne + cek isActive), diduplikasi sengaja
  // (konvensi existing codebase ini, bukan diekstrak jadi helper lintas
  // modul — lihat resolveConversionFactor() di bawah untuk pola yang sama).
  private async resolveSalesman(
    salesmanId: string,
    manager: EntityManager,
  ): Promise<Salesman> {
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

  private async saveLines(
    salesOrderId: string,
    lineContexts: LineContext[],
    manager: EntityManager,
  ): Promise<SalesOrderLine[]> {
    const savedLines: SalesOrderLine[] = [];
    for (let i = 0; i < lineContexts.length; i++) {
      const ctx = lineContexts[i];
      const line = await manager.save(
        SalesOrderLine,
        manager.create(SalesOrderLine, {
          salesOrderId,
          lineOrder: i + 1,
          productId: ctx.product.id,
          unitId: ctx.unit.id,
          qtyInput: ctx.dto.qtyInput.toFixed(4),
          qtyBaseUnit: ctx.qtyBaseUnit.toFixed(4),
          unitPrice:
            ctx.dto.unitPrice != null ? ctx.dto.unitPrice.toFixed(2) : null,
        }),
      );
      savedLines.push(line);
    }
    return savedLines;
  }

  private async resolveLineContexts(
    lines: CreateSalesOrderLineDto[],
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

  // Duplikasi PurchaseInvoicesService.resolveConversionFactor() dengan
  // sengaja — bukan diekstrak jadi helper bersama, konvensi existing di
  // codebase ini (dikonfirmasi lewat riset Hari 19).
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
}

function normalizeUnitName(value: string): string {
  return value.trim().toLowerCase();
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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
