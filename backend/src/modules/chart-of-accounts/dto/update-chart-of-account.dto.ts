import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import {
  AccountSubtype,
  AccountType,
  NormalBalance,
} from '../entities/chart-of-account.entity';
import { CHART_OF_ACCOUNT_CODE_PATTERN } from './create-chart-of-account.dto';

const CODE_MESSAGE =
  'code harus format GG.KKK.JJJJJ (2-3-5 digit dipisah titik), contoh 01.120.00001.';

export class UpdateChartOfAccountDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(CHART_OF_ACCOUNT_CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsEnum(NormalBalance)
  normalBalance?: NormalBalance;

  @IsOptional()
  @IsEnum(AccountSubtype)
  accountSubtype?: AccountSubtype;

  // null = jadikan akun Grup level teratas (lepas dari induknya).
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  parentId?: string | null;

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
