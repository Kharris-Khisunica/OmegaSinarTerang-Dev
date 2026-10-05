import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { OpenInvoicesQueryDto } from './dto/open-invoices-query.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { PaymentsService } from './payments.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // WAJIB dideklarasikan SEBELUM @Get(':id') — kalau kebalik, Nest akan
  // menangkap "open-invoices" sebagai nilai :id (pola sama
  // PurchaseReturnsController.findBadStockLots()).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Get('open-invoices')
  findOpenInvoices(@Query() query: OpenInvoicesQueryDto) {
    return this.paymentsService.findOpenInvoicesList(query);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Get()
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'payment_batches')
  @Post('confirm')
  confirm(@Body() dto: ConfirmPaymentDto, @Req() req: RequestWithUser) {
    return this.paymentsService.confirm(dto, req.user);
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) — tidak butuh
  // header x-authorization-request-id sama sekali.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'payment_batches')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.paymentsService.registerPrint(id);
  }

  // x-authorization-request-id      -> UNLOCK_PRINT (kunci cetak, §2.16,
  //                                    semua role, hanya kalau PRINTED).
  // x-void-authorization-request-id -> VOID_DOCUMENT (§2.13, hanya untuk
  //                                    OPERATOR). Dua gerbang independen,
  //                                    pola sama SalesInvoicesController.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'payment_batches')
  @Post(':id/void')
  voidBatch(
    @Param('id') id: string,
    @Body() dto: VoidPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    const voidHeaderId = req.headers['x-void-authorization-request-id'];
    const voidAuthorizationRequestId = Array.isArray(voidHeaderId)
      ? voidHeaderId[0]
      : voidHeaderId;
    return this.paymentsService.voidBatch(
      id,
      dto,
      req.user,
      authorizationRequestId,
      voidAuthorizationRequestId,
    );
  }
}
