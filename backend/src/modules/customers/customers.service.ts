import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

const SORTABLE_COLUMNS = [
  'code',
  'name',
  'isPkp',
  'isActive',
  'createdAt',
] as const;

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(ChartOfAccount)
    private readonly chartOfAccountsRepository: Repository<ChartOfAccount>,
  ) {}

  async findAll(query: CustomerQueryDto): Promise<PaginatedResult<Customer>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'name',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.customersRepository.createQueryBuilder('customer');

    if (query.search) {
      qb.andWhere(
        '(customer.code ILIKE :search OR customer.name ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`customer.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer tidak ditemukan.');
    }
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (dto.arAccountId) {
      await this.assertReceivableAccount(dto.arAccountId);
    }

    const customer = this.customersRepository.create({
      code: dto.code,
      name: dto.name,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      district: dto.district ?? null,
      city: dto.city ?? null,
      province: dto.province ?? null,
      isPkp: dto.isPkp ?? false,
      arAccountId: dto.arAccountId ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.customersRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.findOne(id);

    if (dto.arAccountId) {
      await this.assertReceivableAccount(dto.arAccountId);
    }

    await this.customersRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.district !== undefined && { district: dto.district }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.province !== undefined && { province: dto.province }),
      ...(dto.isPkp !== undefined && { isPkp: dto.isPkp }),
      ...(dto.arAccountId !== undefined && { arAccountId: dto.arAccountId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return this.findOne(id);
  }

  private async assertReceivableAccount(accountId: string): Promise<void> {
    const account = await this.chartOfAccountsRepository.findOne({
      where: { id: accountId },
    });
    if (!account || !account.isActive || !account.isReceivableAccount) {
      throw new BadRequestException(
        'ar_account_id harus akun aktif bertipe piutang.',
      );
    }
  }
}
