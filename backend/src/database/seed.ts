import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum';
import { User } from '../modules/users/entities/user.entity';
import { AppDataSource } from './data-source';

const BCRYPT_COST = 10;

const SEED_USERS: Array<{
  username: string;
  password: string;
  fullName: string;
  role: Role;
}> = [
  {
    username: 'master',
    password: 'master',
    fullName: 'Master Admin',
    role: Role.MASTER,
  },
  {
    username: 'supervisor',
    password: 'supervisor',
    fullName: 'Supervisor',
    role: Role.SUPERVISOR,
  },
  {
    username: 'operator',
    password: 'operator',
    fullName: 'Operator',
    role: Role.OPERATOR,
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const repository = AppDataSource.getRepository(User);

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, BCRYPT_COST);
    const existing = await repository.findOne({
      where: { username: seedUser.username },
    });

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.fullName = seedUser.fullName;
      existing.role = seedUser.role;
      existing.isActive = true;
      await repository.save(existing);
      console.log(`Diperbarui: ${seedUser.username}`);
      continue;
    }

    const user = repository.create({
      username: seedUser.username,
      passwordHash,
      fullName: seedUser.fullName,
      role: seedUser.role,
      isActive: true,
    });
    await repository.save(user);
    console.log(`Dibuat: ${seedUser.username}`);
  }

  await AppDataSource.destroy();
}

seed()
  .then(() => {
    console.log('Seed selesai.');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('Seed gagal:', error);
    process.exit(1);
  });
