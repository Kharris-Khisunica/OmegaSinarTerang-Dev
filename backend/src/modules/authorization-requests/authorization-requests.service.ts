import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateAuthorizationRequestDto } from './dto/create-authorization-request.dto';
import {
  AuthorizationRequest,
  AuthorizationRequestStatus,
} from './entities/authorization-request.entity';
import { matchesApprovedPayload } from './payload-matchers';
import {
  StepUpNotReadyError,
  StepUpPayloadMismatchError,
} from './step-up-not-ready.error';

/**
 * TTL dipakai dua kali dengan makna berbeda (CLAUDE.md §13):
 * - Saat dibuat (PENDING): batas waktu permintaan menunggu disetujui.
 * - Saat disetujui (APPROVED): di-reset dari waktu approve, jadi batas waktu
 *   dieksekusi. Field `expires_at` yang sama dipakai ulang untuk kedua tahap
 *   supaya satu pengecekan (`expiresAt <= now`) berlaku untuk keduanya.
 */
export const STEP_UP_TTL_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

@Injectable()
export class AuthorizationRequestsService {
  constructor(
    @InjectRepository(AuthorizationRequest)
    private readonly repo: Repository<AuthorizationRequest>,
  ) {}

  // `manager` opsional dari pemanggil (pola sama ArAccountResolverService,
  // Hari 8) — StepUpService.requireApproval() dipanggil DARI DALAM service
  // bisnis lain (mis. VOID/pengeluaran kas), jadi konsumsi approval WAJIB
  // ikut transaction yang sama: kalau aksi bisnisnya rollback, status
  // EXECUTED authorization_request itu ikut rollback juga (CLAUDE.md §6).
  private repoFor(manager?: EntityManager): Repository<AuthorizationRequest> {
    return manager ? manager.getRepository(AuthorizationRequest) : this.repo;
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateAuthorizationRequestDto,
    manager?: EntityManager,
  ): Promise<AuthorizationRequest> {
    const repo = this.repoFor(manager);
    const now = new Date();
    const entity = repo.create({
      requesterId: user.sub,
      actionType: dto.actionType,
      payload: dto.payload,
      contextSummary: dto.contextSummary,
      reason: dto.reason,
      status: AuthorizationRequestStatus.PENDING,
      expiresAt: addMinutes(now, STEP_UP_TTL_MINUTES),
    });
    return repo.save(entity);
  }

  async findPending(): Promise<AuthorizationRequest[]> {
    const rows = await this.repo.find({
      where: { status: AuthorizationRequestStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
    const checked = await Promise.all(
      rows.map((row) => this.applyLazyExpiry(row)),
    );
    return checked.filter(
      (row) => row.status === AuthorizationRequestStatus.PENDING,
    );
  }

  // Dipakai halaman "Antrian Persetujuan" (FE Hari 10) untuk tab semua
  // status — lazy-expiry tetap diterapkan tiap baris (bukan cuma PENDING)
  // supaya baris APPROVED yang TTL eksekusinya sudah habis juga ikut
  // ter-flip ke EXPIRED sebelum dikirim ke FE, bukan tersangkut sampai
  // ada yang membaca baris itu lewat findOneOrFail().
  async findAll(): Promise<AuthorizationRequest[]> {
    const rows = await this.repo.find({ order: { createdAt: 'DESC' } });
    return Promise.all(rows.map((row) => this.applyLazyExpiry(row)));
  }

  async findOneOrFail(
    id: string,
    manager?: EntityManager,
  ): Promise<AuthorizationRequest> {
    const repo = this.repoFor(manager);
    const found = await repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException('Permintaan otorisasi tidak ditemukan.');
    }
    return this.applyLazyExpiry(found, manager);
  }

  async approve(
    id: string,
    approver: AuthenticatedUser,
  ): Promise<AuthorizationRequest> {
    const reqRow = await this.findOneOrFail(id);

    if (reqRow.requesterId === approver.sub) {
      throw new ForbiddenException(
        'Tidak boleh menyetujui permintaan otorisasi milik sendiri.',
      );
    }
    if (reqRow.status === AuthorizationRequestStatus.EXPIRED) {
      throw new BadRequestException('Permintaan otorisasi sudah kedaluwarsa.');
    }
    if (reqRow.status !== AuthorizationRequestStatus.PENDING) {
      throw new BadRequestException(
        'Permintaan otorisasi sudah diproses sebelumnya.',
      );
    }

    const now = new Date();
    reqRow.status = AuthorizationRequestStatus.APPROVED;
    reqRow.approverId = approver.sub;
    reqRow.approvedAt = now;
    reqRow.expiresAt = addMinutes(now, STEP_UP_TTL_MINUTES);
    return this.repo.save(reqRow);
  }

  async reject(
    id: string,
    approver: AuthenticatedUser,
    reason: string,
  ): Promise<AuthorizationRequest> {
    const reqRow = await this.findOneOrFail(id);

    if (reqRow.requesterId === approver.sub) {
      throw new ForbiddenException(
        'Tidak boleh menolak permintaan otorisasi milik sendiri.',
      );
    }
    if (reqRow.status !== AuthorizationRequestStatus.PENDING) {
      throw new BadRequestException(
        'Permintaan otorisasi sudah diproses sebelumnya.',
      );
    }

    reqRow.status = AuthorizationRequestStatus.REJECTED;
    reqRow.approverId = approver.sub;
    // Menimpa `reason` (semula "kenapa step-up ini diminta") dengan alasan
    // penolakan Supervisor/Master — begitu status REJECTED, field ini jadi
    // satu-satunya tempat operator (lewat GET /:id) melihat kenapa ditolak.
    reqRow.reason = reason;
    return this.repo.save(reqRow);
  }

  /**
   * Dipakai StepUpGuard/StepUpService saat eksekusi aksi bersyarat. Bukan
   * cuma baca status — transisi APPROVED->EXECUTED dilakukan lewat
   * UPDATE ... WHERE status='APPROVED' AND expires_at > now() supaya expired
   * dicek ULANG di level DB tepat saat eksekusi (bukan cuma dipercaya dari
   * status yang mungkin sudah basi), dan sekali affected=1 request itu tidak
   * bisa dipakai lagi (sekali pakai).
   *
   * `currentPayload` adalah body/isi aksi yang SEDANG dieksekusi — WAJIB
   * cocok dengan payload yang disetujui (CLAUDE.md §19), dicek per actionType
   * lewat matchesApprovedPayload() SEBELUM update atomik di atas dijalankan.
   * Kalau tidak cocok, approval TIDAK ikut terkonsumsi (tetap APPROVED) —
   * request itu masih bisa dipakai kalau payload yang benar disusulkan.
   */
  async consumeApproval(
    id: string,
    user: AuthenticatedUser,
    actionType: string,
    currentPayload: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<AuthorizationRequest> {
    const repo = this.repoFor(manager);
    const reqRow = await this.findOneOrFail(id, manager);

    if (reqRow.requesterId !== user.sub) {
      throw new ForbiddenException(
        'Permintaan otorisasi ini bukan milik Anda.',
      );
    }
    if (reqRow.actionType !== actionType) {
      throw new BadRequestException(
        'Permintaan otorisasi tidak sesuai dengan aksi ini.',
      );
    }

    switch (reqRow.status) {
      case AuthorizationRequestStatus.PENDING:
        throw new StepUpNotReadyError(
          'Permintaan otorisasi masih menunggu persetujuan.',
        );
      case AuthorizationRequestStatus.REJECTED:
        throw new StepUpNotReadyError('Permintaan otorisasi ditolak.');
      case AuthorizationRequestStatus.EXPIRED:
        throw new StepUpNotReadyError(
          'Permintaan otorisasi sudah kedaluwarsa.',
        );
      case AuthorizationRequestStatus.EXECUTED:
        throw new StepUpNotReadyError(
          'Persetujuan ini sudah pernah dipakai (sekali pakai).',
        );
      case AuthorizationRequestStatus.APPROVED:
        break;
    }

    if (
      !matchesApprovedPayload(reqRow.actionType, reqRow.payload, currentPayload)
    ) {
      throw new StepUpPayloadMismatchError(
        'Isi permintaan yang dieksekusi tidak sama dengan yang disetujui Supervisor/Master.',
      );
    }

    const result = await repo
      .createQueryBuilder()
      .update(AuthorizationRequest)
      .set({
        status: AuthorizationRequestStatus.EXECUTED,
        executedAt: () => 'now()',
      })
      .where('id = :id', { id })
      .andWhere('status = :approved', {
        approved: AuthorizationRequestStatus.APPROVED,
      })
      .andWhere('expires_at > now()')
      .execute();

    if (result.affected !== 1) {
      throw new StepUpNotReadyError(
        'Permintaan otorisasi sudah kedaluwarsa atau sudah dipakai.',
      );
    }

    return this.findOneOrFail(id, manager);
  }

  private async applyLazyExpiry(
    reqRow: AuthorizationRequest,
    manager?: EntityManager,
  ): Promise<AuthorizationRequest> {
    const isExpirable =
      reqRow.status === AuthorizationRequestStatus.PENDING ||
      reqRow.status === AuthorizationRequestStatus.APPROVED;

    if (isExpirable && reqRow.expiresAt.getTime() <= Date.now()) {
      reqRow.status = AuthorizationRequestStatus.EXPIRED;
      return this.repoFor(manager).save(reqRow);
    }
    return reqRow;
  }
}
