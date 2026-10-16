import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * Manajemen user (need_fixing.md #24) — integration test terhadap Postgres
 * asli, pola sama spec modul lain. Semua user dibuat test ini sendiri
 * (username acak) dan dihapus di afterAll.
 */
describe('UsersService (manajemen user)', () => {
  let dataSource: DataSource;
  let service: UsersService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [User],
    });
    await dataSource.initialize();
    service = new UsersService(dataSource.getRepository(User));
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await dataSource.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [
        createdIds,
      ]);
      await dataSource.query('DELETE FROM users WHERE id = ANY($1)', [
        createdIds,
      ]);
    }
    await dataSource.destroy();
  });

  function uname(prefix: string): string {
    return `${prefix}-${randomUUID().slice(0, 8)}`;
  }

  async function createUser(role: Role) {
    const user = await service.create({
      username: uname('t'),
      fullName: 'Uji User',
      role,
      password: 'rahasia123',
    });
    createdIds.push(user.id);
    return user;
  }

  function asActor(id: string): AuthenticatedUser {
    return { sub: id, username: 'actor', role: Role.MASTER };
  }

  it('create() menyimpan hash bcrypt, respons TIDAK memuat hash password/refresh token', async () => {
    const user = await createUser(Role.OPERATOR);
    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('refreshTokenHash');

    const row = await service.findById(user.id);
    expect(row?.passwordHash).not.toBe('rahasia123');
    expect(await bcrypt.compare('rahasia123', row!.passwordHash)).toBe(true);
  });

  it('create() username dobel -> ditolak', async () => {
    const user = await createUser(Role.OPERATOR);
    await expect(
      service.create({
        username: user.username,
        fullName: 'Kembar',
        role: Role.OPERATOR,
        password: 'rahasia123',
      }),
    ).rejects.toThrow(/sudah dipakai/i);
  });

  it('resetPassword() mengganti hash dan mengosongkan refresh token (paksa logout)', async () => {
    const user = await createUser(Role.SUPERVISOR);
    await service.setRefreshTokenHash(user.id, 'hash-lama');

    await service.resetPassword(user.id, { password: 'baru12345' });
    const row = await service.findById(user.id);
    expect(await bcrypt.compare('baru12345', row!.passwordHash)).toBe(true);
    expect(row?.refreshTokenHash).toBeNull();
  });

  it('update() nonaktifkan user lain -> isActive false + refresh token dikosongkan', async () => {
    const actor = await createUser(Role.MASTER);
    const target = await createUser(Role.OPERATOR);
    await service.setRefreshTokenHash(target.id, 'hash-lama');

    const updated = await service.update(
      target.id,
      { isActive: false },
      asActor(actor.id),
    );
    expect(updated.isActive).toBe(false);
    expect((await service.findById(target.id))?.refreshTokenHash).toBeNull();
  });

  it('update() MASTER menonaktifkan/menurunkan role dirinya sendiri -> ditolak', async () => {
    const self = await createUser(Role.MASTER);
    await expect(
      service.update(self.id, { isActive: false }, asActor(self.id)),
    ).rejects.toThrow(/akun Anda sendiri/i);
    await expect(
      service.update(self.id, { role: Role.OPERATOR }, asActor(self.id)),
    ).rejects.toThrow(/akun Anda sendiri/i);
    // Ganti nama diri sendiri tetap boleh.
    const renamed = await service.update(
      self.id,
      { fullName: 'Nama Baru' },
      asActor(self.id),
    );
    expect(renamed.fullName).toBe('Nama Baru');
  });

  it('update() menurunkan MASTER lain saat masih ada MASTER aktif lain -> boleh', async () => {
    const actor = await createUser(Role.MASTER);
    const target = await createUser(Role.MASTER);
    const updated = await service.update(
      target.id,
      { role: Role.SUPERVISOR },
      asActor(actor.id),
    );
    expect(updated.role).toBe(Role.SUPERVISOR);
  });
});
