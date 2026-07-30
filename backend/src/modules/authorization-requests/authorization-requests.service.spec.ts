import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { ActionType } from './action-type.enum';
import { AuthorizationRequestsService } from './authorization-requests.service';
import { AuthorizationRequest } from './entities/authorization-request.entity';
import { StepUpPayloadMismatchError } from './step-up-not-ready.error';

/**
 * Integration test terhadap Postgres asli (pola sama DocumentCounterService/
 * ArAccountResolverService) — instantiasi langsung, bukan lewat Nest DI.
 * Fokus di sini: validasi ulang payload saat consumeApproval() (CLAUDE.md
 * §19) dan dukungan EntityManager dari transaction pemanggil (CLAUDE.md §6),
 * dua hal yang tidak dites lewat authorization-requests.spec.ts (yang
 * fokusnya ke jalur HTTP guard).
 */
describe('AuthorizationRequestsService — payload matching & manager passthrough', () => {
  let dataSource: DataSource;
  let service: AuthorizationRequestsService;
  let requesterId: string;
  let approverId: string;
  let requester: AuthenticatedUser;
  const createdRequestIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [User, AuthorizationRequest],
    });
    await dataSource.initialize();
    service = new AuthorizationRequestsService(
      dataSource.getRepository(AuthorizationRequest),
    );

    const usersRepo = dataSource.getRepository(User);
    const suffix = Date.now();
    const requesterRow = await usersRepo.save(
      usersRepo.create({
        username: `test_arsvc_requester_${suffix}`,
        passwordHash: 'x',
        fullName: 'Test AR Service Requester',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    requesterId = requesterRow.id;
    createdUserIds.push(requesterId);
    requester = {
      sub: requesterId,
      username: requesterRow.username,
      role: Role.OPERATOR,
    };

    const approverRow = await usersRepo.save(
      usersRepo.create({
        username: `test_arsvc_approver_${suffix}`,
        passwordHash: 'x',
        fullName: 'Test AR Service Approver',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    approverId = approverRow.id;
    createdUserIds.push(approverId);
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await dataSource
        .getRepository(AuthorizationRequest)
        .delete(createdRequestIds);
    }
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      createdUserIds,
    ]);
    await dataSource.getRepository(User).delete(createdUserIds);
    await dataSource.destroy();
  });

  async function createApproved(
    payload: Record<string, unknown>,
  ): Promise<string> {
    const created = await service.create(requester, {
      actionType: ActionType.CASH_OUTFLOW,
      payload,
      contextSummary: `Pengeluaran kas Rp ${String(payload.amount)}`,
      reason: 'Uji payload matcher',
    });
    createdRequestIds.push(created.id);
    await service.approve(created.id, {
      sub: approverId,
      username: 'approver',
      role: Role.SUPERVISOR,
    });
    return created.id;
  }

  it('approval Rp 1.000.000 DITOLAK saat dipakai mengeksekusi Rp 100.000.000 (payload mismatch)', async () => {
    const id = await createApproved({
      accountId: 'acc-kas-besar',
      amount: 1_000_000,
    });

    await expect(
      service.consumeApproval(id, requester, ActionType.CASH_OUTFLOW, {
        accountId: 'acc-kas-besar',
        amount: 100_000_000,
      }),
    ).rejects.toThrow(StepUpPayloadMismatchError);

    const row = await dataSource
      .getRepository(AuthorizationRequest)
      .findOneOrFail({ where: { id } });
    expect(row.status).toBe('APPROVED');
  });

  it('approval yang gagal dipakai karena payload mismatch TIDAK terkonsumsi — payload yang benar tetap bisa dipakai sesudahnya', async () => {
    const id = await createApproved({
      accountId: 'acc-kas-besar',
      amount: 1_000_000,
    });

    await expect(
      service.consumeApproval(id, requester, ActionType.CASH_OUTFLOW, {
        accountId: 'acc-kas-besar',
        amount: 100_000_000,
      }),
    ).rejects.toThrow(StepUpPayloadMismatchError);

    const executed = await service.consumeApproval(
      id,
      requester,
      ActionType.CASH_OUTFLOW,
      { accountId: 'acc-kas-besar', amount: 1_000_000 },
    );
    expect(executed.status).toBe('EXECUTED');
  });

  it('EntityManager dari transaction pemanggil: rollback transaction membatalkan konsumsi approval juga', async () => {
    const id = await createApproved({
      accountId: 'acc-kas-besar',
      amount: 500_000,
    });

    await expect(
      dataSource.transaction(async (manager) => {
        const executed = await service.consumeApproval(
          id,
          requester,
          ActionType.CASH_OUTFLOW,
          { accountId: 'acc-kas-besar', amount: 500_000 },
          manager,
        );
        expect(executed.status).toBe('EXECUTED');
        throw new Error('Sengaja gagal supaya transaction rollback');
      }),
    ).rejects.toThrow('Sengaja gagal supaya transaction rollback');

    const row = await dataSource
      .getRepository(AuthorizationRequest)
      .findOneOrFail({ where: { id } });
    expect(row.status).toBe('APPROVED');
    expect(row.executedAt).toBeNull();
  });
});
