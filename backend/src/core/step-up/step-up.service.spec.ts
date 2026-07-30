import {
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { Role } from '../../common/enums/role.enum';
import { ActionType } from '../../modules/authorization-requests/action-type.enum';
import { AuthorizationRequestsService } from '../../modules/authorization-requests/authorization-requests.service';
import { AuthorizationRequest } from '../../modules/authorization-requests/entities/authorization-request.entity';
import { StepUpRequiredBody } from '../../modules/authorization-requests/step-up-response';
import { User } from '../../modules/users/entities/user.entity';
import { StepUpService } from './step-up.service';

/**
 * DoD Hari 9: "StepUpService.requireApproval() dari dalam service
 * menghasilkan response 412 dengan bentuk yang identik dengan guard
 * (bandingkan JSON-nya berdampingan)". Test ini memicu KEDUA jalur — guard
 * lewat HTTP sungguhan, StepUpService lewat pemanggilan langsung — dan
 * membandingkan bentuknya berdampingan (bukan cuma percaya keduanya memakai
 * helper yang sama).
 */
describe('StepUpService — kontrak 412 identik dengan StepUpGuard', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let authorizationRequestsService: AuthorizationRequestsService;
  let stepUpService: StepUpService;

  let masterUserId: string;
  let supervisorUserId: string;
  let operatorUserId: string;
  let operatorToken: string;
  let supervisorToken: string;

  const createdRequestIds: string[] = [];
  const createdUserIds: string[] = [];

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
    authorizationRequestsService = moduleRef.get(AuthorizationRequestsService);
    stepUpService = moduleRef.get(StepUpService);

    const usersRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const suffix = Date.now();

    const master = await usersRepository.save(
      usersRepository.create({
        username: `test_master_stepupsvc_${suffix}`,
        passwordHash,
        fullName: 'Test Master StepUpService',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;
    createdUserIds.push(masterUserId);

    const supervisor = await usersRepository.save(
      usersRepository.create({
        username: `test_supervisor_stepupsvc_${suffix}`,
        passwordHash,
        fullName: 'Test Supervisor StepUpService',
        role: Role.SUPERVISOR,
        isActive: true,
      }),
    );
    supervisorUserId = supervisor.id;
    createdUserIds.push(supervisorUserId);

    const operator = await usersRepository.save(
      usersRepository.create({
        username: `test_operator_stepupsvc_${suffix}`,
        passwordHash,
        fullName: 'Test Operator StepUpService',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;
    createdUserIds.push(operatorUserId);

    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const sign = (id: string, username: string, role: Role) =>
      jwtService.signAsync(
        { sub: id, username, role, type: 'access' },
        { secret, expiresIn: '15m' },
      );

    operatorToken = await sign(
      operatorUserId,
      operator.username,
      Role.OPERATOR,
    );
    supervisorToken = await sign(
      supervisorUserId,
      supervisor.username,
      Role.SUPERVISOR,
    );
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
    await app.close();
  });

  it('bentuk 412 dari guard (HTTP) dan dari StepUpService (dipanggil langsung) identik', async () => {
    // Sisi guard: lewat HTTP sungguhan, actionType generik TEST_STEP_UP_ACTION.
    const guardRes = await request(app.getHttpServer())
      .post('/authorization-requests/test-step-up-action')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({})
      .expect(412);
    const guardBody = guardRes.body as StepUpRequiredBody;
    createdRequestIds.push(guardBody.authorizationRequestId);

    // Sisi StepUpService: dipanggil langsung dari "dalam service", tanpa HTTP.
    let serviceException: HttpException | undefined;
    try {
      await stepUpService.requireApproval({
        user: {
          sub: operatorUserId,
          username: 'operator',
          role: Role.OPERATOR,
        },
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: 'acc-kas-besar', amount: 1_000_000 },
        contextSummary: 'Pengeluaran kas Rp 1.000.000 dari Kas Besar',
      });
    } catch (err) {
      serviceException = err as HttpException;
    }
    expect(serviceException).toBeInstanceOf(HttpException);
    const serviceStatus = serviceException!.getStatus();
    const serviceBody = serviceException!.getResponse() as StepUpRequiredBody;
    createdRequestIds.push(serviceBody.authorizationRequestId);

    // Status identik.
    expect(serviceStatus).toBe(412);
    expect(guardRes.status).toBe(412);

    // Bentuk (key set + tipe tiap field) identik berdampingan — id & message
    // isinya beda (dua request berbeda), tapi kontraknya harus sama persis.
    expect(Object.keys(serviceBody).sort()).toEqual(
      Object.keys(guardBody).sort(),
    );
    expect(serviceBody.requiresAuthorization).toBe(true);
    expect(guardBody.requiresAuthorization).toBe(true);
    expect(typeof serviceBody.authorizationRequestId).toBe('string');
    expect(typeof guardBody.authorizationRequestId).toBe('string');
    expect(typeof serviceBody.message).toBe('string');
    expect(typeof guardBody.message).toBe('string');
  });

  it('setelah SUPERVISOR approve, StepUpService.requireApproval() lolos (tidak throw) dan approval sekali pakai', async () => {
    const created = await authorizationRequestsService.create(
      { sub: operatorUserId, username: 'operator', role: Role.OPERATOR },
      {
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: 'acc-kas-besar', amount: 250_000 },
        contextSummary: 'Pengeluaran kas Rp 250.000 dari Kas Besar',
        reason: 'Uji StepUpService end-to-end',
      },
    );
    createdRequestIds.push(created.id);

    await request(app.getHttpServer())
      .post(`/authorization-requests/${created.id}/approve`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .expect(201);

    await expect(
      stepUpService.requireApproval({
        user: {
          sub: operatorUserId,
          username: 'operator',
          role: Role.OPERATOR,
        },
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: 'acc-kas-besar', amount: 250_000 },
        contextSummary: 'Pengeluaran kas Rp 250.000 dari Kas Besar',
        authorizationRequestId: created.id,
      }),
    ).resolves.toBeUndefined();

    let secondException: HttpException | undefined;
    try {
      await stepUpService.requireApproval({
        user: {
          sub: operatorUserId,
          username: 'operator',
          role: Role.OPERATOR,
        },
        actionType: ActionType.CASH_OUTFLOW,
        payload: { accountId: 'acc-kas-besar', amount: 250_000 },
        contextSummary: 'Pengeluaran kas Rp 250.000 dari Kas Besar',
        authorizationRequestId: created.id,
      });
    } catch (err) {
      secondException = err as HttpException;
    }
    expect(secondException).toBeInstanceOf(HttpException);
    expect(secondException!.getStatus()).toBe(412);
    const secondBody = secondException!.getResponse() as StepUpRequiredBody;
    expect(secondBody.message).toMatch(/sekali pakai/i);
  });
});
