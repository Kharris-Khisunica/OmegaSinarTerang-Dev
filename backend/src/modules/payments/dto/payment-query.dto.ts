import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaymentInvoiceType } from '../entities/payment.entity';

export class PaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentInvoiceType)
  invoiceType?: PaymentInvoiceType;
}
