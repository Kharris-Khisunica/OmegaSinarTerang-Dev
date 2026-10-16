import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { User } from './entities/user.entity';

const BCRYPT_COST = 10;

const SORTABLE_COLUMNS = ['username', 'fullName', 'role', 'createdAt'] as const;

/** Bentuk user yang boleh keluar dari API — TANPA hash password/refresh token. */
export interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.usersRepository.update({ id: userId }, { refreshTokenHash });
  }

  // ---- Manajemen user (need_fixing.md #24, MASTER-only di controller) -------

  async findAll(query: UserQueryDto): Promise<PaginatedResult<PublicUser>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'username',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.usersRepository.createQueryBuilder('user');
    if (query.search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    qb.orderBy(`user.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data.map(toPublic), total, page, limit);
  }

  async findOnePublic(id: string): Promise<PublicUser> {
    return toPublic(await this.getOrThrow(id));
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const username = dto.username.trim().toLowerCase();
    const existing = await this.findByUsername(username);
    if (existing) {
      throw new BadRequestException(`Username "${username}" sudah dipakai.`);
    }
    const saved = await this.usersRepository.save(
      this.usersRepository.create({
        username,
        fullName: dto.fullName.trim(),
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
        isActive: true,
        refreshTokenHash: null,
      }),
    );
    return toPublic(saved);
  }

  /**
   * Dua pengaman supaya MASTER tidak mengunci dirinya/semua orang keluar:
   * (1) tidak boleh menonaktifkan atau menurunkan role AKUN SENDIRI;
   * (2) tidak boleh menghilangkan MASTER aktif terakhir. Menonaktifkan user
   * juga mengosongkan refresh token-nya — sesi berakhir paling lambat saat
   * access token kedaluwarsa (JwtStrategy menolak user tidak aktif).
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<PublicUser> {
    const user = await this.getOrThrow(id);
    const losesMaster =
      user.role === Role.MASTER &&
      user.isActive &&
      ((dto.role !== undefined && dto.role !== Role.MASTER) ||
        dto.isActive === false);

    if (id === actor.sub && losesMaster) {
      throw new BadRequestException(
        'Tidak bisa menonaktifkan atau menurunkan role akun Anda sendiri.',
      );
    }
    if (losesMaster) {
      await this.assertAnotherActiveMaster(id);
    }

    const patch: Partial<User> = {};
    if (dto.fullName !== undefined) patch.fullName = dto.fullName.trim();
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
      if (!dto.isActive) patch.refreshTokenHash = null;
    }
    await this.usersRepository.update({ id }, patch);
    return this.findOnePublic(id);
  }

  /** Reset password + paksa logout (refresh token dikosongkan). */
  async resetPassword(id: string, dto: ResetPasswordDto): Promise<PublicUser> {
    await this.getOrThrow(id);
    await this.usersRepository.update(
      { id },
      {
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
        refreshTokenHash: null,
      },
    );
    return this.findOnePublic(id);
  }

  private async getOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }
    return user;
  }

  private async assertAnotherActiveMaster(excludeId: string): Promise<void> {
    const count = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.role = :role AND user.isActive = true AND user.id <> :id', {
        role: Role.MASTER,
        id: excludeId,
      })
      .getCount();
    if (count === 0) {
      throw new BadRequestException(
        'Harus ada minimal satu MASTER aktif — buat/aktifkan MASTER lain dulu.',
      );
    }
  }
}
