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
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { ReviewSalesInvoiceDto } from './dto/review-sales-invoice.dto';
import { ReviseSalesInvoiceDto } from './dto/revise-sales-invoice.dto';
import { SalesInvoiceQueryDto } from './dto/sales-invoice-query.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import { VoidSalesInvoiceDto } from './dto/void-sales-invoice.dto';
import { SalesInvoicesService } from './sales-invoices.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('sales-invoices')
export class SalesInvoicesController {
  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  // Dipakai ulang oleh Pengecekan Invoice Harian (Hari 22A) lewat filter
  // ?reviewStatus= — SUPERVISOR juga boleh baca (KONTEKS_REVISI §2.2).
  @Get()
  findAll(@Query() query: SalesInvoiceQueryDto) {
    return this.salesInvoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesInvoicesService.findOne(id);
  }

  // CLAUDE.md §5: Sales Invoice (write) MASTER+OPERATOR, SUPERVISOR 403.
  // Header dibaca manual (bukan lewat StepUpGuard/@RequiresStepUp) — syarat
  // step-up di sini bergantung ISI faktur (batas jual-rugi per baris), bukan
  // sekadar role+endpoint (pola identik WarehouseMutationsController.create()).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'sales_invoices')
  @Post()
  create(@Body() dto: CreateSalesInvoiceDto, @Req() req: RequestWithUser) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.salesInvoicesService.create(
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16) — tidak butuh
  // header x-authorization-request-id sama sekali.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'sales_invoices')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.salesInvoicesService.registerPrint(id);
  }

  // Pengecekan Invoice Harian (Hari 22A, CLAUDE.md §5): HANYA mengubah
  // reviewStatus/reviewNote/reviewedBy/reviewedAt — tidak pernah lewat
  // update()/PrintLockService. Setelah-fakta, tidak memblokir operator
  // mencetak/lanjut kerja. SUPERVISOR sengaja masuk whitelist di sini
  // (beda dari update()/voidInvoice() di bawah yang MASTER+OPERATOR saja) —
  // inilah satu-satunya jalan tulis milik Supervisor ke faktur.
  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('REVIEW', 'sales_invoices')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewSalesInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesInvoicesService.review(id, dto, req.user);
  }

  // Header dibaca manual — syarat step-up di sini bergantung print_status
  // dokumen, bukan sekadar role+endpoint (pola identik
  // PurchaseInvoicesController.update()).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('EDIT', 'sales_invoices')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.salesInvoicesService.update(
      id,
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // Revisi-di-tempat (paket R6, CLAUDE.md §2.2 pengecualian K2/§2.16/§2.17).
  // DUA header independen, pola sama voidInvoice() di bawah tapi actionType
  // beda:
  //   x-authorization-request-id            -> UNLOCK_PRINT (§2.16, hanya
  //                                             kalau faktur PRINTED)
  //   x-sell-below-cost-authorization-request-id -> SELL_BELOW_COST (§2.17,
  //                                             hanya kalau ADA baris hasil
  //                                             revisi di bawah harga pokok)
  // Menyatukannya jadi satu header akan menabrak actionType berbeda di
  // AuthorizationRequestsService.consumeApproval() — JANGAN disederhanakan.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('REVISE', 'sales_invoices')
  @Patch(':id/revise')
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseSalesInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    const sellBelowCostHeaderId =
      req.headers['x-sell-below-cost-authorization-request-id'];
    const sellBelowCostAuthorizationRequestId = Array.isArray(
      sellBelowCostHeaderId,
    )
      ? sellBelowCostHeaderId[0]
      : sellBelowCostHeaderId;
    return this.salesInvoicesService.reviseInvoice(
      id,
      dto,
      req.user,
      authorizationRequestId,
      sellBelowCostAuthorizationRequestId,
    );
  }

  // DUA header independen, bukan satu — VOID faktur menggabungkan DUA gerbang
  // step-up yang tidak bisa berbagi satu authorization_request:
  //   x-authorization-request-id       -> UNLOCK_PRINT (kunci cetak, §2.16,
  //                                        berlaku untuk SEMUA role, hanya
  //                                        kalau faktur sudah PRINTED)
  //   x-void-authorization-request-id  -> VOID_DOCUMENT (§2.13, hanya untuk
  //                                        role OPERATOR, tidak peduli status
  //                                        cetak)
  // Menyatukannya jadi satu header akan menabrak actionType yang berbeda di
  // AuthorizationRequestsService.consumeApproval() (400, bukan 412 yang bisa
  // di-retry) — lihat SalesInvoicesService.voidInvoice(). JANGAN
  // disederhanakan jadi satu header.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'sales_invoices')
  @Post(':id/void')
  voidInvoice(
    @Param('id') id: string,
    @Body() dto: VoidSalesInvoiceDto,
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
    return this.salesInvoicesService.voidInvoice(
      id,
      dto,
      req.user,
      authorizationRequestId,
      voidAuthorizationRequestId,
    );
  }
}
