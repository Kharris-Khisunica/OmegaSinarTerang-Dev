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
import { CreateOperationalExpenseBatchDto } from './dto/create-operational-expense-batch.dto';
import { CreateOperationalExpenseLineDto } from './dto/create-operational-expense-line.dto';
import { OperationalExpenseQueryDto } from './dto/operational-expense-query.dto';
import { ReviewOperationalExpenseDocumentDto } from './dto/review-operational-expense-document.dto';
import { UpdateOperationalExpenseLineDto } from './dto/update-operational-expense-line.dto';
import { VoidOperationalExpenseLineDto } from './dto/void-operational-expense-line.dto';
import { OperationalExpensesService } from './operational-expenses.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('operational-expenses')
export class OperationalExpensesController {
  constructor(
    private readonly operationalExpensesService: OperationalExpensesService,
  ) {}

  @Get()
  findAll(@Query() query: OperationalExpenseQueryDto) {
    return this.operationalExpensesService.findAll(query);
  }

  // Akun biaya untuk dropdown Entri — tanpa @Roles (sama seperti findAll/
  // findOne di controller ini), karena OPERATOR menulis endpoint ini
  // (createLine di bawah) tapi GET /chart-of-accounts penuh MASTER+SUPERVISOR
  // saja (CLAUDE.md §5). Pola sama ChartOfAccountsController.findCashAccounts()
  // — irisan sempit COA yang memang perlu dibaca OPERATOR untuk transaksi,
  // bukan pelonggaran guard COA umum.
  @Get('expense-accounts')
  findExpenseAccounts(@Req() req: RequestWithUser) {
    return this.operationalExpensesService.findExpenseAccounts(req.user.role);
  }

  // Tab Kasbon (Hari 32A FE) — dropdown akun dikunci ke akun ini, dibaca
  // OPERATOR juga (sama pola findExpenseAccounts di atas). Rute statis WAJIB
  // di atas ':id' (Nest mencocokkan urutan deklarasi).
  @Get('employee-receivable-account')
  findEmployeeReceivableAccount() {
    return this.operationalExpensesService.findEmployeeReceivableAccount();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.operationalExpensesService.findOne(id);
  }

  // CLAUDE.md §5: Biaya Operasional (write) MASTER+OPERATOR, SUPERVISOR 403.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'operational_expenses')
  @Post()
  createLine(
    @Body() dto: CreateOperationalExpenseLineDto,
    @Req() req: RequestWithUser,
  ) {
    // Header dibaca manual (bukan lewat StepUpGuard/@RequiresStepUp) karena
    // syarat step-up di sini bergantung ISI baris (akun kas bertanda + di
    // atas ambang), bukan sekadar role+endpoint — StepUpService
    // .requireApproval() dipanggil dari dalam service (pola sama
    // warehouse-mutations.controller.ts).
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.operationalExpensesService.createLine(
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // Paket R10 (docs/RENCANA_REVISI_TESTING_KLIEN.md §3 "R10") — entri
  // multi-baris, tanggal+akun kas GLOBAL. Roles/step-up header sama persis
  // createLine() di atas.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'operational_expenses')
  @Post('batch')
  createBatch(
    @Body() dto: CreateOperationalExpenseBatchDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.operationalExpensesService.createBatch(
      dto,
      req.user,
      authorizationRequestId,
    );
  }

  // Hari 32A tugas 6 — edit langsung selama review_status BUKAN DISETUJUI
  // (CLAUDE.md §3 "Biaya Operasional"). Roles sama seperti createLine().
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('UPDATE', 'operational_expenses')
  @Patch('lines/:lineId')
  updateLine(
    @Param('lineId') lineId: string,
    @Body() dto: UpdateOperationalExpenseLineDto,
    @Req() req: RequestWithUser,
  ) {
    return this.operationalExpensesService.updateLine(lineId, dto, req.user);
  }

  // Approval setelah-fakta (Hari 32A tugas 5) — SUPERVISOR sengaja masuk
  // whitelist di sini (beda dari createLine()/updateLine() di atas), pola
  // sama SalesInvoicesController.review()/CashTransfersController.review().
  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('REVIEW', 'operational_expenses')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewOperationalExpenseDocumentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.operationalExpensesService.review(id, dto, req.user);
  }

  // VOID per baris — lihat catatan operational-expense-line.entity.ts. Tidak
  // ada step-up VOID hari ini (aturan umum CLAUDE.md §2.13 belum
  // diimplementasikan modul mana pun, menyusul Hari 21 — lihat komentar
  // purchase-invoices.service.ts).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'operational_expenses')
  @Post('lines/:lineId/void')
  voidLine(
    @Param('lineId') lineId: string,
    @Body() dto: VoidOperationalExpenseLineDto,
    @Req() req: RequestWithUser,
  ) {
    return this.operationalExpensesService.voidLine(lineId, dto, req.user);
  }
}
