import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { PurchaseInvoiceQueryDto } from './dto/purchase-invoice-query.dto';
import { ReviewPurchaseInvoiceDto } from './dto/review-purchase-invoice.dto';
import { RevisePurchaseInvoiceDto } from './dto/revise-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { VoidPurchaseInvoiceDto } from './dto/void-purchase-invoice.dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
  ) {}

  // Dipakai ulang oleh Pengecekan Invoice Harian (Hari 22A) lewat filter
  // ?reviewStatus= — SUPERVISOR juga boleh baca (KONTEKS_REVISI §2.2).
  @Get()
  findAll(@Query() query: PurchaseInvoiceQueryDto) {
    return this.purchaseInvoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseInvoicesService.findOne(id);
  }

  // CLAUDE.md §5: Purchase Invoice (write) MASTER+OPERATOR, SUPERVISOR 403.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'purchase_invoices')
  @Post()
  create(@Body() dto: CreatePurchaseInvoiceDto, @Req() req: RequestWithUser) {
    return this.purchaseInvoicesService.create(dto, req.user);
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) — tidak butuh
  // header x-authorization-request-id sama sekali.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'purchase_invoices')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.purchaseInvoicesService.registerPrint(id);
  }

  // Pengecekan Invoice Harian (Hari 22A, CLAUDE.md §5): HANYA mengubah
  // reviewStatus/reviewNote/reviewedBy/reviewedAt — tidak pernah lewat
  // update()/PrintLockService. Setelah-fakta, tidak memblokir operator
  // mencetak/lanjut kerja. SUPERVISOR sengaja masuk whitelist di sini
  // (beda dari update()/voidInvoice() di bawah yang MASTER+OPERATOR saja) —
  // inilah satu-satunya jalan tulis milik Supervisor ke faktur.
  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('REVIEW', 'purchase_invoices')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewPurchaseInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseInvoicesService.review(id, dto, req.user);
  }

  // Header dibaca manual (bukan lewat StepUpGuard/@RequiresStepUp) — syarat
  // step-up di sini bergantung print_status dokumen, bukan sekadar
  // role+endpoint (pola identik WarehouseMutationsController.create()).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('EDIT', 'purchase_invoices')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.purchaseInvoicesService.update(
      id,
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // Revisi-di-tempat (paket R6, CLAUDE.md §2.2 pengecualian K2). Satu header
  // saja (beda dari sales invoice) — faktur pembelian tidak punya gerbang
  // SELL_BELOW_COST (§2.17 hanya berlaku penjualan).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('REVISE', 'purchase_invoices')
  @Patch(':id/revise')
  revise(
    @Param('id') id: string,
    @Body() dto: RevisePurchaseInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.purchaseInvoicesService.reviseInvoice(
      id,
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // DUA header independen, pola sama SalesInvoicesController.voidInvoice():
  //   x-authorization-request-id       -> UNLOCK_PRINT (§2.16)
  //   x-void-authorization-request-id  -> VOID_DOCUMENT (§2.13, OPERATOR)
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'purchase_invoices')
  @Post(':id/void')
  voidInvoice(
    @Param('id') id: string,
    @Body() dto: VoidPurchaseInvoiceDto,
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
    return this.purchaseInvoicesService.voidInvoice(
      id,
      dto,
      req.user,
      authorizationRequestId,
      voidAuthorizationRequestId,
    );
  }
}
