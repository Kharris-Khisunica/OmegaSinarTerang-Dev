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
import { Supplier } from './entities/supplier.entity';

interface PaginatedSuppliers {
  data: Supplier[];
}

// supertest mengetik `Response.body` sebagai `any` — lewatkan dulu lewat
// parameter `unknown` supaya cast di bawah tidak kena no-unsafe-member-access.
function asPaginatedSuppliers(body: unknown): PaginatedSuppliers {
  return body as PaginatedSuppliers;
}

function asSupplier(body: unknown): Supplier {
  return body as Supplier;
}

/**
 * Integration test end-to-end (guard JWT+RBAC sungguhan, interceptor
 * sungguhan, DB sungguhan) — bukan mock. Buktikan aturan CLAUDE.md §3:
 * GET /suppliers untuk OPERATOR wajib masking name/contact_phone/
 * contact_address, display_code tetap utuh; MASTER melihat penuh.
 */
describe('Suppliers masking (OPERATOR vs MASTER)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let masterToken: string;
  let operatorToken: string;
  let masterUserId: string;
  let operatorUserId: string;
  let supplierId: string;
  let supplierDisplayCode: string;

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
        username: `test_master_masking_${suffix}`,
        passwordHash,
        fullName: 'Test Master Masking',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    masterUserId = master.id;

    const operator = await usersRepository.save(
      usersRepository.create({
        username: `test_operator_masking_${suffix}`,
        passwordHash,
        fullName: 'Test Operator Masking',
        role: Role.OPERATOR,
        isActive: true,
      }),
    );
    operatorUserId = operator.id;

    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    masterToken = await jwtService.signAsync(
      {
        sub: master.id,
        username: master.username,
        role: Role.MASTER,
        type: 'access',
      },
      { secret, expiresIn: '15m' },
    );
    operatorToken = await jwtService.signAsync(
      {
        sub: operator.id,
        username: operator.username,
        role: Role.OPERATOR,
        type: 'access',
      },
      { secret, expiresIn: '15m' },
    );

    const createRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        name: 'PT Abadi Jaya',
        contactPhone: '081234567789',
        contactAddress: 'Jalan Merdeka No 10',
      })
      .expect(201);

    supplierId = asSupplier(createRes.body).id;
    supplierDisplayCode = asSupplier(createRes.body).displayCode;
  });

  afterAll(async () => {
    await dataSource.getRepository(Supplier).delete(supplierId);
    await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
      [masterUserId, operatorUserId],
    ]);
    await dataSource.getRepository(User).delete([masterUserId, operatorUserId]);
    await app.close();
  });

  it('MASTER melihat data supplier penuh (list & detail)', async () => {
    const list = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer ${masterToken}`)
      .expect(200);
    const row = asPaginatedSuppliers(list.body).data.find(
      (s) => s.id === supplierId,
    );
    expect(row?.name).toBe('PT ABADI JAYA');
    expect(row?.contactPhone).toBe('081234567789');
    expect(row?.contactAddress).toBe('JALAN MERDEKA NO 10');
    expect(row?.displayCode).toBe(supplierDisplayCode);

    const detail = await request(app.getHttpServer())
      .get(`/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .expect(200);
    expect(asSupplier(detail.body).name).toBe('PT ABADI JAYA');
    expect(asSupplier(detail.body).contactPhone).toBe('081234567789');
  });

  it('OPERATOR melihat data supplier ter-mask (list & detail), display_code tetap utuh', async () => {
    const list = await request(app.getHttpServer())
      .get('/suppliers')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);
    const row = asPaginatedSuppliers(list.body).data.find(
      (s) => s.id === supplierId,
    );
    expect(row?.name).toBe('PT A***');
    expect(row?.contactPhone).toBe('0812****789');
    expect(row?.contactAddress).toBe('JALAN M***');
    expect(row?.displayCode).toBe(supplierDisplayCode);

    const detail = await request(app.getHttpServer())
      .get(`/suppliers/${supplierId}`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);
    expect(asSupplier(detail.body).name).toBe('PT A***');
    expect(asSupplier(detail.body).contactPhone).toBe('0812****789');
    expect(asSupplier(detail.body).displayCode).toBe(supplierDisplayCode);
  });
});
