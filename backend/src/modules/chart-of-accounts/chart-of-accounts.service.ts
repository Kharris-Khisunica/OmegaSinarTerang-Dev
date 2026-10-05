import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChartOfAccountDto } from './dto/create-chart-of-account.dto';
import { UpdateChartOfAccountDto } from './dto/update-chart-of-account.dto';
import {
  AccountSubtype,
  ChartOfAccount,
  NormalBalance,
} from './entities/chart-of-account.entity';

// COA_USULAN.md §7.1 — kombinasi account_subtype x normal_balance yang
// mustahil. Affari sendiri pernah kebalik (8 dari 13 akun Akumulasi
// Penyusutan tercatat Debet, tidak ada yang menghadangnya) — validasi ini
// yang mencegahnya terulang, termasuk saat MASTER membuat akun sendiri.
const REQUIRED_NORMAL_BALANCE: Record<AccountSubtype, NormalBalance> = {
  [AccountSubtype.CURRENT_ASSET]: NormalBalance.DEBIT,
  [AccountSubtype.FIXED_ASSET]: NormalBalance.DEBIT,
  [AccountSubtype.ACCUMULATED_DEPRECIATION]: NormalBalance.CREDIT,
  [AccountSubtype.NON_OPERATING_ASSET]: NormalBalance.DEBIT,
  [AccountSubtype.CURRENT_LIABILITY]: NormalBalance.CREDIT,
  [AccountSubtype.LONG_TERM_LIABILITY]: NormalBalance.CREDIT,
  [AccountSubtype.NON_OPERATING_LIABILITY]: NormalBalance.CREDIT,
  [AccountSubtype.EQUITY]: NormalBalance.CREDIT,
  [AccountSubtype.CONTRA_EQUITY]: NormalBalance.DEBIT,
  [AccountSubtype.REVENUE]: NormalBalance.CREDIT,
  [AccountSubtype.CONTRA_REVENUE]: NormalBalance.DEBIT,
  [AccountSubtype.COGS]: NormalBalance.DEBIT,
  [AccountSubtype.SELLING_EXPENSE]: NormalBalance.DEBIT,
  [AccountSubtype.ADMIN_EXPENSE]: NormalBalance.DEBIT,
  [AccountSubtype.OWNER_EXPENSE]: NormalBalance.DEBIT,
  [AccountSubtype.OTHER_INCOME]: NormalBalance.CREDIT,
  [AccountSubtype.OTHER_EXPENSE]: NormalBalance.DEBIT,
};

// COA_USULAN.md §7.2 — flag yang HARUS dimiliki tepat satu akun aktif,
// karena AccountResolverService.resolveSingleActive() melempar error kalau
// hasilnya bukan tepat satu (dipakai OpeningBalanceService/PurchaseInvoicesService/
// PurchaseReturnsService). isReceivableAccount SENGAJA tidak masuk daftar
// ini — boleh dimiliki lebih dari satu akun (dipakai customers.service.ts
// untuk validasi pilihan, bukan resolve tunggal).
type SingularFlagKey =
  | 'isInventoryAccount'
  | 'isPayableAccount'
  | 'isInputVatAccount'
  | 'isPurchaseReturnDiffAccount'
  | 'isPaymentDiffAccount'
  | 'isPurchaseDiscountAccount'
  | 'isOpeningBalanceEquityAccount'
  | 'isRevenueAccount'
  | 'isSalesDiscountAccount'
  | 'isCogsAccount'
  | 'isOutputVatAccount'
  | 'isSalesReturnAccount';

const SINGULAR_FLAGS: {
  column: SingularFlagKey;
  sqlColumn: string;
  label: string;
}[] = [
  {
    column: 'isInventoryAccount',
    sqlColumn: 'is_inventory_account',
    label: 'Persediaan',
  },
  {
    column: 'isPayableAccount',
    sqlColumn: 'is_payable_account',
    label: 'Hutang Usaha',
  },
  {
    column: 'isInputVatAccount',
    sqlColumn: 'is_input_vat_account',
    label: 'PPN Masukan',
  },
  {
    column: 'isPurchaseReturnDiffAccount',
    sqlColumn: 'is_purchase_return_diff_account',
    label: 'Selisih Retur Pembelian',
  },
  {
    column: 'isPaymentDiffAccount',
    sqlColumn: 'is_payment_diff_account',
    label: 'Selisih Pembayaran',
  },
  {
    column: 'isPurchaseDiscountAccount',
    sqlColumn: 'is_purchase_discount_account',
    label: 'Diskon Pembelian',
  },
  {
    column: 'isOpeningBalanceEquityAccount',
    sqlColumn: 'is_opening_balance_equity_account',
    label: 'penyeimbang Saldo Awal (Modal)',
  },
  {
    column: 'isRevenueAccount',
    sqlColumn: 'is_revenue_account',
    label: 'Pendapatan Penjualan',
  },
  {
    column: 'isSalesDiscountAccount',
    sqlColumn: 'is_sales_discount_account',
    label: 'Diskon Penjualan',
  },
  {
    column: 'isCogsAccount',
    sqlColumn: 'is_cogs_account',
    label: 'Harga Pokok Penjualan',
  },
  {
    column: 'isOutputVatAccount',
    sqlColumn: 'is_output_vat_account',
    label: 'PPN Keluaran',
  },
  {
    column: 'isSalesReturnAccount',
    sqlColumn: 'is_sales_return_account',
    label: 'Retur Penjualan',
  },
];

@Injectable()
export class ChartOfAccountsService {
  constructor(
    @InjectRepository(ChartOfAccount)
    private readonly chartOfAccountsRepository: Repository<ChartOfAccount>,
  ) {}

  findAll(): Promise<ChartOfAccount[]> {
    return this.chartOfAccountsRepository.find({ order: { code: 'ASC' } });
  }

  // Dipakai picker akun kas/bank (mis. Retur Pembelian settlementType=CASH,
  // Hari 16) — sengaja TIDAK lewat findAll() + filter FE, supaya OPERATOR
  // tidak pernah menerima daftar akun penuh (COA di luar cash-accounts
  // tetap MASTER+SUPERVISOR saja, lihat controller).
  findCashAccounts(): Promise<ChartOfAccount[]> {
    return this.chartOfAccountsRepository.find({
      where: { isCashAccount: true, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ChartOfAccount> {
    const account = await this.chartOfAccountsRepository.findOne({
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Akun tidak ditemukan.');
    }
    return account;
  }

  async create(dto: CreateChartOfAccountDto): Promise<ChartOfAccount> {
    await this.assertCodeUnique(dto.code);
    this.assertNormalBalanceMatchesSubtype(
      dto.accountSubtype,
      dto.normalBalance,
    );
    if (dto.parentId) {
      await this.assertParentIsHeader(dto.parentId);
    }
    await this.assertSingularFlagsAvailable(dto);

    const account = this.chartOfAccountsRepository.create({
      code: dto.code,
      name: dto.name,
      accountType: dto.accountType,
      normalBalance: dto.normalBalance,
      accountSubtype: dto.accountSubtype,
      parentId: dto.parentId ?? null,
      isPostable: dto.isPostable ?? true,
      isCashAccount: dto.isCashAccount ?? false,
      isReceivableAccount: dto.isReceivableAccount ?? false,
      isInventoryAccount: dto.isInventoryAccount ?? false,
      isPayableAccount: dto.isPayableAccount ?? false,
      isInputVatAccount: dto.isInputVatAccount ?? false,
      isPurchaseReturnDiffAccount: dto.isPurchaseReturnDiffAccount ?? false,
      isPaymentDiffAccount: dto.isPaymentDiffAccount ?? false,
      isPurchaseDiscountAccount: dto.isPurchaseDiscountAccount ?? false,
      isOpeningBalanceEquityAccount: dto.isOpeningBalanceEquityAccount ?? false,
      isRevenueAccount: dto.isRevenueAccount ?? false,
      isSalesDiscountAccount: dto.isSalesDiscountAccount ?? false,
      isCogsAccount: dto.isCogsAccount ?? false,
      isOutputVatAccount: dto.isOutputVatAccount ?? false,
      isSalesReturnAccount: dto.isSalesReturnAccount ?? false,
      requiresOutflowApproval: dto.requiresOutflowApproval ?? false,
      restrictedToMaster: dto.restrictedToMaster ?? false,
      isEmployeeReceivableAccount: dto.isEmployeeReceivableAccount ?? false,
      isActive: dto.isActive ?? true,
    });
    return this.chartOfAccountsRepository.save(account);
  }

  async update(
    id: string,
    dto: UpdateChartOfAccountDto,
  ): Promise<ChartOfAccount> {
    const existing = await this.findOne(id);

    if (dto.code !== undefined && dto.code !== existing.code) {
      await this.assertCodeUnique(dto.code, id);
    }

    if (dto.accountSubtype !== undefined || dto.normalBalance !== undefined) {
      this.assertNormalBalanceMatchesSubtype(
        dto.accountSubtype ?? existing.accountSubtype,
        dto.normalBalance ?? existing.normalBalance,
      );
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Akun tidak bisa dijadikan induk dari dirinya sendiri.',
        );
      }
      if (dto.parentId) {
        await this.assertParentIsHeader(dto.parentId);
      }
    }

    await this.assertSingularFlagsAvailable(dto, existing, id);

    await this.chartOfAccountsRepository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.accountType !== undefined && { accountType: dto.accountType }),
      ...(dto.normalBalance !== undefined && {
        normalBalance: dto.normalBalance,
      }),
      ...(dto.accountSubtype !== undefined && {
        accountSubtype: dto.accountSubtype,
      }),
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.isPostable !== undefined && { isPostable: dto.isPostable }),
      ...(dto.isCashAccount !== undefined && {
        isCashAccount: dto.isCashAccount,
      }),
      ...(dto.isReceivableAccount !== undefined && {
        isReceivableAccount: dto.isReceivableAccount,
      }),
      ...(dto.isInventoryAccount !== undefined && {
        isInventoryAccount: dto.isInventoryAccount,
      }),
      ...(dto.isPayableAccount !== undefined && {
        isPayableAccount: dto.isPayableAccount,
      }),
      ...(dto.isInputVatAccount !== undefined && {
        isInputVatAccount: dto.isInputVatAccount,
      }),
      ...(dto.isPurchaseReturnDiffAccount !== undefined && {
        isPurchaseReturnDiffAccount: dto.isPurchaseReturnDiffAccount,
      }),
      ...(dto.isPaymentDiffAccount !== undefined && {
        isPaymentDiffAccount: dto.isPaymentDiffAccount,
      }),
      ...(dto.isPurchaseDiscountAccount !== undefined && {
        isPurchaseDiscountAccount: dto.isPurchaseDiscountAccount,
      }),
      ...(dto.isOpeningBalanceEquityAccount !== undefined && {
        isOpeningBalanceEquityAccount: dto.isOpeningBalanceEquityAccount,
      }),
      ...(dto.isRevenueAccount !== undefined && {
        isRevenueAccount: dto.isRevenueAccount,
      }),
      ...(dto.isSalesDiscountAccount !== undefined && {
        isSalesDiscountAccount: dto.isSalesDiscountAccount,
      }),
      ...(dto.isCogsAccount !== undefined && {
        isCogsAccount: dto.isCogsAccount,
      }),
      ...(dto.isOutputVatAccount !== undefined && {
        isOutputVatAccount: dto.isOutputVatAccount,
      }),
      ...(dto.isSalesReturnAccount !== undefined && {
        isSalesReturnAccount: dto.isSalesReturnAccount,
      }),
      ...(dto.requiresOutflowApproval !== undefined && {
        requiresOutflowApproval: dto.requiresOutflowApproval,
      }),
      ...(dto.restrictedToMaster !== undefined && {
        restrictedToMaster: dto.restrictedToMaster,
      }),
      ...(dto.isEmployeeReceivableAccount !== undefined && {
        isEmployeeReceivableAccount: dto.isEmployeeReceivableAccount,
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    return this.findOne(id);
  }

  private async assertCodeUnique(
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.chartOfAccountsRepository
      .createQueryBuilder('account')
      .where('account.code = :code', { code });
    if (excludeId) {
      qb.andWhere('account.id != :excludeId', { excludeId });
    }
    const clash = await qb.getOne();
    if (clash) {
      throw new BadRequestException(`Kode akun "${code}" sudah dipakai.`);
    }
  }

  private assertNormalBalanceMatchesSubtype(
    accountSubtype: AccountSubtype,
    normalBalance: NormalBalance,
  ): void {
    const required = REQUIRED_NORMAL_BALANCE[accountSubtype];
    if (required !== normalBalance) {
      throw new BadRequestException(
        `Kombinasi tidak valid: akun bersubtipe ${accountSubtype} wajib bersaldo normal ${required}, bukan ${normalBalance}.`,
      );
    }
  }

  private async assertParentIsHeader(parentId: string): Promise<void> {
    const parent = await this.chartOfAccountsRepository.findOne({
      where: { id: parentId },
    });
    if (!parent || !parent.isActive) {
      throw new BadRequestException(
        'Akun induk (parentId) tidak ditemukan atau tidak aktif.',
      );
    }
    if (parent.isPostable) {
      throw new BadRequestException(
        `Akun induk harus akun header (Grup/Kategori) — "${parent.code} ${parent.name}" adalah akun Jenis (dapat dijurnal), tidak bisa menaruh akun lain di bawahnya.`,
      );
    }
  }

  private async assertSingularFlagsAvailable(
    dto: CreateChartOfAccountDto | UpdateChartOfAccountDto,
    existing?: ChartOfAccount,
    excludeId?: string,
  ): Promise<void> {
    for (const flag of SINGULAR_FLAGS) {
      const wantsFlag = dto[flag.column] === true;
      if (!wantsFlag) {
        continue;
      }
      // Update: kalau akun ini SUDAH pegang flag itu, tidak perlu cek ulang.
      if (existing && existing[flag.column] === true) {
        continue;
      }
      const qb = this.chartOfAccountsRepository
        .createQueryBuilder('account')
        .where(`account.${flag.sqlColumn} = true`)
        .andWhere('account.is_active = true');
      if (excludeId) {
        qb.andWhere('account.id != :excludeId', { excludeId });
      }
      const holder = await qb.getOne();
      if (holder) {
        throw new BadRequestException(
          `Akun ${flag.label} harus tepat satu — sudah dipegang "${holder.code} ${holder.name}". Nonaktifkan atau lepas flag itu dulu sebelum memindahkannya.`,
        );
      }
    }
  }
}
