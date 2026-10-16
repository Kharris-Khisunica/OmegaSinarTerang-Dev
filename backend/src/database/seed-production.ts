import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { User } from '../modules/users/entities/user.entity';
import { ProdDataSource } from './data-source.prod';

// Seed AWAL produksi (idempotent): MASTER pertama + identitas toko.
// Dibaca dari environment — tidak ada password bawaan. Seed dev (seed.ts,
// user master/master) tidak boleh dipakai di PC klien.
const BCRYPT_COST = 10;
const MIN_PASSWORD_LENGTH = 10;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variabel ${name} wajib diisi di .env.`);
  }
  return value;
}

async function seed(): Promise<void> {
  const username = required('SEED_MASTER_USERNAME');
  const password = required('SEED_MASTER_PASSWORD');
  const fullName = process.env.SEED_MASTER_FULLNAME?.trim() || 'Master';

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_MASTER_PASSWORD minimal ${MIN_PASSWORD_LENGTH} karakter.`,
    );
  }
  if (password.toLowerCase() === username.toLowerCase()) {
    throw new Error('SEED_MASTER_PASSWORD tidak boleh sama dengan username.');
  }

  await ProdDataSource.initialize();
  try {
    const repository = ProdDataSource.getRepository(User);
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const existing = await repository.findOne({ where: { username } });

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.fullName = fullName;
      existing.role = Role.MASTER;
      existing.isActive = true;
      await repository.save(existing);
      console.log(`MASTER diperbarui: ${username}`);
    } else {
      await repository.save(
        repository.create({
          username,
          passwordHash,
          fullName,
          role: Role.MASTER,
          isActive: true,
        }),
      );
      console.log(`MASTER dibuat: ${username}`);
    }

    // Identitas toko (baris settings sudah dibuat migration; kosong = tidak dicetak).
    const storeSettings: Record<string, string | undefined> = {
      store_name: process.env.STORE_NAME,
      store_city: process.env.STORE_CITY,
      store_phone: process.env.STORE_PHONE,
    };
    for (const [key, value] of Object.entries(storeSettings)) {
      if (value === undefined || value.trim() === '') continue;
      await ProdDataSource.query(
        `UPDATE settings SET value = $1 WHERE key = $2`,
        [value.trim(), key],
      );
      console.log(`Setting ${key} diisi.`);
    }
  } finally {
    await ProdDataSource.destroy();
  }
}

seed()
  .then(() => {
    console.log('Seed produksi selesai.');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Seed produksi gagal:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
