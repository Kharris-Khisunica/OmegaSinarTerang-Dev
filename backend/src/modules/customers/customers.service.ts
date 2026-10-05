import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { generateSequenceCode } from '../../common/generate-sequence-code';
import { toUpperTrim } from '../../common/normalize-text';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly arAccountResolverService: ArAccountResolverService,
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

  // arAccountBalance: field baca-saja (bukan kolom, tidak pernah disimpan)
  // dipakai FE (CrudFormPage form Ubah Pelanggan) untuk mengunci dropdown
  // ar_account_id SEBELUM operator mencoba submit — assertBalanceIsZero()
  // di update() sudah menolak perubahan lewat 400, ini cuma mengekspos angka
  // yang sama lebih awal supaya field-nya bisa disabled + diberi alasan.
  async findOneWithBalance(
    id: string,
  ): Promise<Customer & { arAccountBalance: number }> {
    const customer = await this.findOne(id);
    const arAccountBalance =
      await this.arAccountResolverService.getCustomerBalance(customer.id);
    return { ...customer, arAccountBalance };
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    if (dto.arAccountId) {
      await this.assertReceivableAccount(dto.arAccountId);
    }

    const code =
      dto.code ??
      (await generateSequenceCode(
        this.dataSource,
        'customer_code_seq',
        'CUST',
      ));

    const customer = this.customersRepository.create({
      code,
      name: toUpperTrim(dto.name),
      phone: dto.phone ?? null,
      address: toUpperTrim(dto.address) ?? null,
      district: toUpperTrim(dto.district) ?? null,
      city: toUpperTrim(dto.city) ?? null,
      province: toUpperTrim(dto.province) ?? null,
      isPkp: dto.isPkp ?? false,
      arAccountId: dto.arAccountId ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.customersRepository.save(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.findOne(id);

    const isChangingArAccount =
      dto.arAccountId !== undefined &&
      (dto.arAccountId ?? null) !== (existing.arAccountId ?? null);

    if (isChangingArAccount) {
      if (dto.arAccountId) {
        await this.assertReceivableAccount(dto.arAccountId);
      }
      await this.assertBalanceIsZero(existing);
    }

    await this.customersRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: toUpperTrim(dto.name) }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.address !== undefined && { address: toUpperTrim(dto.address) }),
      ...(dto.district !== undefined && {
        district: toUpperTrim(dto.district),
      }),
      ...(dto.city !== undefined && { city: toUpperTrim(dto.city) }),
      ...(dto.province !== undefined && {
        province: toUpperTrim(dto.province),
      }),
      ...(dto.isPkp !== undefined && { isPkp: dto.isPkp }),
      ...(dto.arAccountId !== undefined && { arAccountId: dto.arAccountId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return this.findOne(id);
  }

  // CLAUDE.md §3: "Dikunci selama saldo pelanggan belum nol." Mengubah
  // ar_account_id di tengah jalan memindahkan saldo tanpa jurnal — nilainya
  // dibaca lewat ArAccountResolverService.getCustomerBalance() (Hari 18),
  // dijumlah dari SEMUA baris jurnal yang di-tag customer_id pelanggan ini,
  // apa pun akun piutangnya (sengaja tidak difilter per akun — lihat komentar
  // getCustomerBalance()).
  private async assertBalanceIsZero(customer: Customer): Promise<void> {
    const balance = await this.arAccountResolverService.getCustomerBalance(
      customer.id,
    );
    if (Math.round(balance * 100) !== 0) {
      throw new BadRequestException(
        `Akun piutang pelanggan "${customer.name}" tidak bisa diubah — masih ada saldo piutang Rp${balance.toFixed(2)}. Lunasi dulu sebelum memindahkan akun piutang.`,
      );
    }
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
