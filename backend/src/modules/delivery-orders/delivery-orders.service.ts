import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { SalesChannel } from '../../common/enums/sales-channel.enum';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ActionType } from '../authorization-requests/action-type.enum';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from '../sales-invoices/entities/sales-invoice.entity';
import { Salesman } from '../salesmen/entities/salesman.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Worker } from '../workers/entities/worker.entity';
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import { DeliveryOrderQueryDto } from './dto/delivery-order-query.dto';
import { UpdateDeliveryOrderStatusDto } from './dto/update-delivery-order-status.dto';
import { UpdateDeliveryOrderWorkersDto } from './dto/update-delivery-order-workers.dto';
import { VoidDeliveryOrderDto } from './dto/void-delivery-order.dto';
import { DeliveryOrderLine } from './entities/delivery-order-line.entity';
import { DeliveryOrderWorker } from './entities/delivery-order-worker.entity';
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
  workers: DeliveryOrderWorker[];
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
 * lewat updateStatus() — TIDAK digerbangi kunci cetak (keputusan 6 Okt
 * 2026, need_fixing.md #18: SJ selalu dicetak sebelum sopir berangkat, jadi
 * gerbang itu membuat SETIAP update status butuh approval; status kirim
 * adalah status sub-ledger, bukan isi dokumen — pola sama paid_amount
 * faktur, CLAUDE.md §2.15). VOID SJ lewat voidDeliveryOrder().
 *
 * Pekerja (tukang angkut, Hari 44) — minimal satu, diganti utuh lewat
 * updateWorkers(), juga BEBAS kunci cetak (keputusan 17 Okt 2026, pola sama
 * status kirim).
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
    private readonly stepUpService: StepUpService,
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
      await this.assertWorkers(manager, dto.workerIds);

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

      const workers = await this.saveWorkers(
        manager,
        deliveryOrder.id,
        dto.workerIds,
      );

      return { deliveryOrder, lines: savedLines, workers };
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

    const qb = this.deliveryOrdersRepository
      .createQueryBuilder('do')
      .leftJoinAndSelect('do.workers', 'worker');
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
      relations: { lines: true, workers: true },
    });
    if (!deliveryOrder) {
      throw new BadRequestException('Surat jalan tidak ditemukan.');
    }
    return deliveryOrder;
  }

  /**
   * Satu-satunya "edit" surat jalan (Hari 25) — status pengiriman. BEBAS
   * tanpa kunci cetak (need_fixing.md #18, lihat komentar kelas): status
   * kirim tidak mengubah isi lembar yang dibawa sopir, jadi print_status &
   * revision_number TIDAK disentuh. Jejaknya di audit_logs (@Audit EDIT di
   * controller, `reason` opsional ikut tercatat di body).
   */
  async updateStatus(
    id: string,
    dto: UpdateDeliveryOrderStatusDto,
  ): Promise<DeliveryOrder> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === DeliveryOrderPostingStatus.VOIDED) {
      throw new BadRequestException(
        'Surat jalan ini sudah VOID, status kirim tidak bisa diubah.',
      );
    }
    await this.deliveryOrdersRepository.update(id, {
      deliveryStatus: dto.deliveryStatus,
    });
    return this.findOne(id);
  }

  /**
   * Ganti daftar pekerja surat jalan (Hari 44). BEBAS kunci cetak (pola sama
   * updateStatus()): print_status & revision_number TIDAK disentuh, jejaknya
   * di audit_logs (@Audit EDIT di controller). SJ VOID ditolak.
   */
  async updateWorkers(
    id: string,
    dto: UpdateDeliveryOrderWorkersDto,
  ): Promise<DeliveryOrder> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === DeliveryOrderPostingStatus.VOIDED) {
      throw new BadRequestException(
        'Surat jalan ini sudah VOID, pekerja tidak bisa diubah.',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await this.assertWorkers(manager, dto.workerIds);
      await manager.delete(DeliveryOrderWorker, { deliveryOrderId: id });
      await this.saveWorkers(manager, id, dto.workerIds);
    });
    return this.findOne(id);
  }

  /**
   * VOID surat jalan (need_fixing.md #18). SJ tidak punya jurnal maupun stok
   * (lihat komentar kelas), jadi TIDAK lewat VoidEngineService (mesin itu
   * membalik jurnal/stok) — cukup posting_status VOIDED + alasan. Gerbangnya
   * PERSIS SalesInvoicesService.voidInvoice():
   *   - UNLOCK_PRINT intent VOID (§2.16, semua role, kalau sudah PRINTED);
   *   - VOID_DOCUMENT (§2.13, hanya OPERATOR).
   * Setelah VOID, faktur asalnya boleh dibuatkan SJ baru (create() hanya
   * menolak kalau masih ada SJ POSTED).
   */
  async voidDeliveryOrder(
    id: string,
    dto: VoidDeliveryOrderDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    voidAuthorizationRequestId?: string,
  ): Promise<DeliveryOrder> {
    const existing = await this.findOne(id);
    if (existing.postingStatus === DeliveryOrderPostingStatus.VOIDED) {
      throw new BadRequestException(
        'Surat jalan ini sudah pernah di-VOID sebelumnya.',
      );
    }
    const unlockReason = dto.unlockReason ?? dto.reasonNote;

    // WAJIB tanpa manager — baris authorization_requests baru tidak boleh
    // ikut rollback (pola sama SalesInvoicesService.voidInvoice()).
    await this.printLockService.preflight({
      table: 'delivery_orders',
      sourceType: 'DELIVERY_ORDER',
      documentId: id,
      documentLabel: existing.deliveryNumber,
      intent: 'VOID',
      reason: unlockReason,
      user,
      authorizationRequestId,
    });

    const needsVoidApproval = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'DELIVERY_ORDER', sourceId: id };
    const voidContextSummary = `VOID surat jalan ${existing.deliveryNumber}: ${dto.reasonNote}`;

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
        table: 'delivery_orders',
        sourceType: 'DELIVERY_ORDER',
        documentId: id,
        documentLabel: existing.deliveryNumber,
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

      await manager.update(DeliveryOrder, id, {
        postingStatus: DeliveryOrderPostingStatus.VOIDED,
        voidReasonCode: dto.reasonCode,
        voidReasonNote: dto.reasonNote,
      });
    });

    return this.findOne(id);
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

  private async assertWorkers(
    manager: EntityManager,
    workerIds: string[],
  ): Promise<void> {
    if (workerIds.length === 0) {
      throw new BadRequestException('Pilih minimal satu pekerja.');
    }
    const workers = await manager.find(Worker, {
      where: { id: In(workerIds) },
    });
    if (workers.length !== new Set(workerIds).size) {
      throw new BadRequestException('Pekerja tidak ditemukan.');
    }
    const inactive = workers.filter((w) => !w.isActive);
    if (inactive.length > 0) {
      throw new BadRequestException(
        `Pekerja nonaktif tidak bisa dipilih: ${inactive.map((w) => w.name).join(', ')}.`,
      );
    }
  }

  private async saveWorkers(
    manager: EntityManager,
    deliveryOrderId: string,
    workerIds: string[],
  ): Promise<DeliveryOrderWorker[]> {
    return manager.save(
      DeliveryOrderWorker,
      workerIds.map((workerId) =>
        manager.create(DeliveryOrderWorker, { deliveryOrderId, workerId }),
      ),
    );
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
