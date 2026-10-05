import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import {
  AccountSubtype,
  AccountType,
  NormalBalance,
} from '../entities/chart-of-account.entity';

// Format Affari, dipertahankan (COA_USULAN.md §2): GG.KKK.JJJJJ.
export const CHART_OF_ACCOUNT_CODE_PATTERN = /^\d{2}\.\d{3}\.\d{5}$/;
const CODE_MESSAGE =
  'code harus format GG.KKK.JJJJJ (2-3-5 digit dipisah titik), contoh 01.120.00001.';

export class CreateChartOfAccountDto {
  @IsString()
  @IsNotEmpty()
  @Matches(CHART_OF_ACCOUNT_CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsEnum(NormalBalance)
  normalBalance: NormalBalance;

  @IsEnum(AccountSubtype)
  accountSubtype: AccountSubtype;

  // Kosongkan hanya untuk akun Grup level teratas — dalam praktik hampir
  // semua akun baru dibuat MASTER adalah Jenis (leaf) di bawah Kategori yang
  // sudah ada, jadi ini nyaris selalu diisi.
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Default true (leaf/dapat dijurnal) di service — MASTER hampir tidak
  // pernah butuh membuat header (Grup/Kategori) baru dari layar ini.
  @IsOptional()
  @IsBoolean()
  isPostable?: boolean;

  @IsOptional()
  @IsBoolean()
  isCashAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isReceivableAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isInventoryAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isPayableAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isInputVatAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isPurchaseReturnDiffAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaymentDiffAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isPurchaseDiscountAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isOpeningBalanceEquityAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isRevenueAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isSalesDiscountAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isCogsAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isOutputVatAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isSalesReturnAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresOutflowApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  restrictedToMaster?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmployeeReceivableAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
