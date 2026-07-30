import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { AuthorizationRequest } from './entities/authorization-request.entity';

interface StepUpErrorBody {
  requiresAuthorization: boolean;
  authorizationRequestId: string;
  message: string;
}

interface AuthorizationRequestBody {
  id: string;
  status: string;
}

function asStepUpError(body: unknown): StepUpErrorBody {
  return body as StepUpErrorBody;
}

function asAuthorizationRequest(body: unknown): AuthorizationRequestBody {
  return body as AuthorizationRequestBody;
}

/**
 * Integration test end-to-end (guard JWT+RBAC+StepUp sungguhan, DB sungguhan)
 * — membuktikan dua aturan wajib CLAUDE.md §13:
 * 1. expires_at dicek SAAT EKSEKUSI, bukan hanya saat approve.
 * 2. Approval tidak bisa dipakai dua kali (sekali pakai).
 * Plus: requester tidak boleh approve/reject permintaannya sendiri.
 */
describe('AuthorizationRequests + StepUpGuard', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;

  let masterUserId: string;
  let supervisorUserId: string;
  let operatorUserId: string;
  let masterToken: string;
  let supervisorToken: string;
  let operatorToken: string;

  const createdRequestIds: string[] = [];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    dataSource = moduleRef.get(DataSource);
    jwtService = moduleRef.get(JwtService);

    const usersRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const suffix = Date.now();

    const master = await usersRepository.save(
      usersRepository.create({
        username: `test_master_stepup_${suffix}`,
        passwordHash,
        fullName: 'Test Master StepUp',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;

    const supervisor = await usersRepository.save(
      usersRepository.create({
        username: `test_supervisor_stepup_${suffix}`,
        passwordHash,
        fullName: 'Test Supervisor StepUp',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;

    const operator = await usersRepository.save(
      usersRepository.create({
        username: `test_operator_stepup_${suffix}`,
        passwordHash,
        fullName: 'Test Operator StepUp',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;

    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const sign = (id: string, username: string, role: Role) =>
      jwtService.signAsync(
        { sub: id, username, role, type: 'access' },
        { secret, expiresIn: '15m' },
      );

    masterToken = await sign(masterUserId, master.username, Role.MASTER);
    supervisorToken = await sign(
      supervisorUserId,
      supervisor.username,
      Role.SUPERVISOR,
    );
    operatorToken = await sign(
      operatorUserId,
      operator.username,
      Role.OPERATOR,
    );
  });

  afterAll(async () => {
    if (createdRequestIds.length > 0) {
      await dataSource
        .getRepository(AuthorizationRequest)
        .delete(createdRequestIds);
    }
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [masterUserId, supervisorUserId, operatorUserId],
    ]);
    await dataSource
      .getRepository(User)
      .delete([masterUserId, supervisorUserId, operatorUserId]);
    await app.close();
  });

  it('OPERATOR memicu aksi bersyarat tanpa persetujuan -> 412 dan authorizationRequestId otomatis dibuat', async () => {
    const res = await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({})
      .expect(412);

    const body = asStepUpError(res.body);
    expect(body.requiresAuthorization).toBe(true);
    expect(typeof body.authorizationRequestId).toBe('string');
    createdRequestIds.push(body.authorizationRequestId);
  });

  it('setelah SUPERVISOR approve, OPERATOR bisa eksekusi sekali; percobaan kedua ditolak (sekali pakai)', async () => {
    const triggerRes = await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({})
      .expect(412);
    const requestId = asStepUpError(triggerRes.body).authorizationRequestId;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-authorization-request-id', requestId)
      .send({})
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual({ ok: true, executedBy: operatorUserId });
      });

    const reuseRes = await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-authorization-request-id', requestId)
      .send({})
      .expect(412);

    const reuseBody = asStepUpError(reuseRes.body);
    expect(reuseBody.requiresAuthorization).toBe(true);
    expect(reuseBody.message).toMatch(/sekali pakai/i);
  });

  it('approval yang sudah lewat expires_at ditolak saat eksekusi (dicek ulang saat itu, bukan cuma saat approve)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/authorization-requests')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        actionType: 'TEST_STEP_UP_ACTION',
        payload: {},
        contextSummary: 'Uji kedaluwarsa TTL 15 menit',
        reason: 'Uji kedaluwarsa TTL 15 menit',
      })
      .expect(201);
    const requestId = asAuthorizationRequest(createRes.body).id;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .expect(201);

    // "Mock waktu" 16 menit berlalu sejak approve: mundurkan expires_at
    // langsung di DB (deterministik, tanpa jest fake timers yang rawan
    // bentrok dengan koneksi pg asli).
    await dataSource.query(
      `UPDATE authorization_requests
       SET expires_at = expires_at - interval '16 minutes'
       WHERE id = $1`,
      [requestId],
    );

    const execRes = await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .set('x-authorization-request-id', requestId)
      .send({})
      .expect(412);

    const execBody = asStepUpError(execRes.body);
    expect(execBody.requiresAuthorization).toBe(true);
    expect(execBody.message).toMatch(/kedaluwarsa/i);

    const reqRow = await dataSource
      .getRepository(AuthorizationRequest)
      .findOne({ where: { id: requestId } });
    expect(reqRow?.status).toBe('EXPIRED');
  });

  it('requester tidak boleh approve permintaan otorisasi miliknya sendiri -> 403', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/authorization-requests')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        actionType: 'TEST_STEP_UP_ACTION',
        payload: {},
        contextSummary: 'Uji larangan self-approve',
        reason: 'Uji larangan self-approve',
      })
      .expect(201);
    const requestId = asAuthorizationRequest(createRes.body).id;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .expect(403);
  });

  it('requester tidak boleh reject permintaan otorisasi miliknya sendiri -> 403', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/authorization-requests')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        actionType: 'TEST_STEP_UP_ACTION',
        payload: {},
        contextSummary: 'Uji larangan self-reject',
        reason: 'Uji larangan self-reject',
      })
      .expect(201);
    const requestId = asAuthorizationRequest(createRes.body).id;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ reason: 'Uji larangan self-reject' })
      .expect(403);
  });

  it('GET /:id — pemilik boleh lihat request miliknya, operator lain tidak (403)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/authorization-requests')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        actionType: 'TEST_STEP_UP_ACTION',
        payload: {},
        contextSummary: 'Uji GET /:id',
        reason: 'Uji GET /:id',
      })
      .expect(201);
    const requestId = asAuthorizationRequest(createRes.body).id;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .get(`/authorization-requests/${requestId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200)
      .expect((res) => {
        expect(asAuthorizationRequest(res.body).id).toBe(requestId);
      });

    await request(app.getHttpServer())
      .get(`/authorization-requests/${requestId}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .expect(200);
  });

  it('reject tanpa reason -> 400; dengan reason -> tersimpan dan terbaca lewat GET /:id', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/authorization-requests')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        actionType: 'TEST_STEP_UP_ACTION',
        payload: {},
        contextSummary: 'Uji alasan tolak',
        reason: 'Uji alasan tolak',
      })
      .expect(201);
    const requestId = asAuthorizationRequest(createRes.body).id;
    createdRequestIds.push(requestId);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({})
      .expect(400);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ reason: 'Stok tidak sesuai, cek ulang dulu' })
      .expect(201);

    const getRes = await request(app.getHttpServer())
      .get(`/authorization-requests/${requestId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);
    expect(getRes.body).toMatchObject({
      status: 'REJECTED',
      reason: 'Stok tidak sesuai, cek ulang dulu',
    });
  });
});
