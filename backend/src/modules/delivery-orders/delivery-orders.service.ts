import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import { DeliveryOrderQueryDto } from './dto/delivery-order-query.dto';
import { UpdateDeliveryOrderStatusDto } from './dto/update-delivery-order-status.dto';
import { DeliveryOrderLine } from './entities/delivery-order-line.entity';
import {
  DeliveryOrder,
  DeliveryOrderPostingStatus,
  DeliveryOrderPrintStatus,
} from './entities/delivery-order.entity';

const SORTABLE_COLUMNS = [
  'deliveryNumber',
  'deliveryDate',
  'createdAt',
] as const;

export interface CreateDeliveryOrderResult {
  deliveryOrder: DeliveryOrder;
  lines: DeliveryOrderLine[];
}

/**
 * Surat Jalan (Hari 24, CLAUDE.md §1/§2.16/§3) — terbentuk DARI satu faktur
 * penjualan bersaluran PENGIRIMAN, membawa salesman_id (sopir yang mengantar
 * & menagih — "Agen" dan "Salesman" adalah orang yang sama, koreksi 26 Sep
 * 2026, migration 1785080602977) & vehicle_id.
 * Faktur bersaluran TOKO ditolak (§1: TOKO tidak perlu surat jalan sama
 * sekali). SATU faktur -> paling banyak SATU surat jalan POSTED sekaligus,
 * dijaga di sini (bukan constraint DB, pola sama validasi kumulatif retur
 * penjualan Hari 23) supaya kalau VOID SJ dibangun nanti (Hari 25) aturannya
 * tinggal baca posting_status yang sudah ada.
 *
 * TIDAK menyentuh stok maupun jurnal sama sekali — stok sudah berkurang saat
 * faktur diposting (channel apa pun, CLAUDE.md §3 "Sales Order tidak menahan
 * stok"), dan surat jalan bukan dokumen uang (nota yang dibawa sopir untuk
 * menagih, bukan SJ). Baris disalin APA ADANYA dari sales_invoice_lines
 * (product/unit/qty), tidak pernah dihitung ulang.
 *
 * Status pengiriman (PENDING/DELIVERED/POSTPONED/RETURNED, Hari 25) diedit
 * lewat updateStatus() — digerbangi kunci cetak (sopir sudah membawa lembar
 * ke jalan setelah dicetak). VOID SJ sendiri TIDAK dibangun hari ini —
 * masih sengaja ditunda, sama seperti RJ/RB menunda VOID di hari
 * pembuatannya.
 */
@Injectable()
export class DeliveryOrdersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(DeliveryOrder)
    private readonly deliveryOrdersRepository: Repository<DeliveryOrder>,
    @InjectRepository(Salesman)
    private readonly salesmenRepository: Repository<Salesman>,
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    private readonly documentCounterService: DocumentCounterService,
    private readonly printLockService: PrintLockService,
  ) {}

  async create(
    dto: CreateDeliveryOrderDto,
    user: AuthenticatedUser,
  ): Promise<CreateDeliveryOrderResult> {
    const deliveryDate = parseDateOnly(dto.deliveryDate);

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
          'Faktur penjualan sudah dibatalkan (VOID), tidak bisa dibuatkan surat jalan.',
        );
      }
      // CLAUDE.md §1: hanya faktur bersaluran PENGIRIMAN yang punya surat
      // jalan. Faktur TOKO diserahkan di tempat, tidak pernah butuh SJ.
      if (invoice.salesChannel !== SalesChannel.PENGIRIMAN) {
        throw new BadRequestException(
          'Faktur bersaluran TOKO tidak bisa dibuatkan surat jalan — hanya faktur PENGIRIMAN.',
        );
      }

      const existing: { id: string }[] = await manager.query(
        `SELECT id FROM delivery_orders WHERE sales_invoice_id = $1 AND posting_status = 'POSTED'`,
        [invoice.id],
      );
      if (existing.length > 0) {
        throw new BadRequestException(
          'Faktur ini sudah punya surat jalan aktif.',
        );
      }

      const salesman = await manager.findOne(Salesman, {
        where: { id: dto.salesmanId },
      });
      if (!salesman) {
        throw new BadRequestException('Salesman tidak ditemukan.');
      }
      const vehicle = await manager.findOne(Vehicle, {
        where: { id: dto.vehicleId },
      });
      if (!vehicle) {
        throw new BadRequestException('Kendaraan tidak ditemukan.');
      }

      const deliveryNumber = await this.documentCounterService.getNextNumber(
        'DELIVERY_ORDER',
        deliveryDate,
        manager,
      );

      const deliveryOrder = await manager.save(
        DeliveryOrder,
        manager.create(DeliveryOrder, {
          deliveryNumber,
          deliveryDate: toDateOnlyString(deliveryDate),
          salesInvoiceId: invoice.id,
          customerId: invoice.customerId,
          salesmanId: salesman.id,
          vehicleId: vehicle.id,
          postingStatus: DeliveryOrderPostingStatus.POSTED,
          printStatus: DeliveryOrderPrintStatus.NOT_PRINTED,
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );

      const savedLines: DeliveryOrderLine[] = [];
      for (let i = 0; i < invoice.lines.length; i++) {
        const invoiceLine = invoice.lines[i];
        const line = await manager.save(
          DeliveryOrderLine,
          manager.create(DeliveryOrderLine, {
            deliveryOrderId: deliveryOrder.id,
            lineOrder: i + 1,
            salesInvoiceLineId: invoiceLine.id,
            productId: invoiceLine.productId,
            unitId: invoiceLine.unitId,
            qtyInput: invoiceLine.qtyInput,
            qtyBaseUnit: invoiceLine.qtyBaseUnit,
          }),
        );
        savedLines.push(line);
      }

      return { deliveryOrder, lines: savedLines };
    });
  }

  async findAll(
    query: DeliveryOrderQueryDto,
  ): Promise<PaginatedResult<DeliveryOrder>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'deliveryDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.deliveryOrdersRepository.createQueryBuilder('do');
    if (query.search) {
      qb.andWhere('do.deliveryNumber ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.salesInvoiceId) {
      qb.andWhere('do.salesInvoiceId = :salesInvoiceId', {
        salesInvoiceId: query.salesInvoiceId,
      });
    }
    if (query.deliveryStatus) {
      qb.andWhere('do.deliveryStatus = :deliveryStatus', {
        deliveryStatus: query.deliveryStatus,
      });
    }

    qb.orderBy(`do.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.deliveryOrdersRepository.findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!deliveryOrder) {
      throw new BadRequestException('Surat jalan tidak ditemukan.');
    }
    return deliveryOrder;
  }

  /**
   * Satu-satunya "edit" surat jalan hari ini (Hari 25) — status pengiriman.
   * Digerbangi kunci cetak (CLAUDE.md §2.16): kalau SJ sudah PRINTED, sopir
   * sudah membawa lembar itu ke jalan, jadi butuh alasan + approval
   * UNLOCK_PRINT (intent EDIT) sebelum status boleh berubah — pola identik
   * PurchaseInvoicesService.update() Hari 15. Kalau belum pernah dicetak,
   * bebas tanpa approval apa pun.
   */
  async updateStatus(
    id: string,
    dto: UpdateDeliveryOrderStatusDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
  ): Promise<DeliveryOrder> {
    const existing = await this.findOne(id);

    // WAJIB tanpa manager — kalau SJ sudah PRINTED dan belum ada
    // authorizationRequestId, baris authorization_requests baru yang
    // dibuat di sini TIDAK BOLEH ikut rollback transaction di bawah (pola
    // sama PurchaseInvoicesService.update()/WarehouseMutationsService.create()).
    await this.printLockService.preflight({
      table: 'delivery_orders',
      sourceType: 'DELIVERY_ORDER',
      documentId: id,
      documentLabel: existing.deliveryNumber,
      intent: 'EDIT',
      reason: dto.reason,
      user,
      authorizationRequestId,
    });

    return this.dataSource.transaction(async (manager) => {
      // No-op kalau SJ belum pernah dicetak — edit bebas tanpa approval
      // apa pun (CLAUDE.md §2.16 literal).
      await this.printLockService.consume({
        table: 'delivery_orders',
        sourceType: 'DELIVERY_ORDER',
        documentId: id,
        documentLabel: existing.deliveryNumber,
        intent: 'EDIT',
        reason: dto.reason,
        user,
        authorizationRequestId,
        manager,
      });

      await manager.update(DeliveryOrder, id, {
        deliveryStatus: dto.deliveryStatus,
      });

      const updated = await manager.findOne(DeliveryOrder, {
        where: { id },
        relations: { lines: true },
      });
      if (!updated) {
        throw new BadRequestException('Surat jalan tidak ditemukan.');
      }
      return updated;
    });
  }

  /**
   * Cetak ulang identik — bebas, tanpa izin (CLAUDE.md §2.16). print_count
   * masuk audit_logs lewat @Audit('PRINT', ...) di controller.
   */
  async registerPrint(id: string): Promise<DeliveryOrder> {
    await this.printLockService.registerPrint({
      table: 'delivery_orders',
      sourceType: 'DELIVERY_ORDER',
      documentId: id,
    });
    return this.findOne(id);
  }
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
