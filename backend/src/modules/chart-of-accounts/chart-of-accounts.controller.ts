import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { CreateChartOfAccountDto } from './dto/create-chart-of-account.dto';
import { UpdateChartOfAccountDto } from './dto/update-chart-of-account.dto';

@Controller('chart-of-accounts')
@Roles(Role.MASTER, Role.SUPERVISOR)
export class ChartOfAccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  // WAJIB dideklarasikan SEBELUM @Get(':id') — rute literal ketabrak rute
  // dinamis kalau dibalik (pola sama findBadStockLots() di
  // PurchaseReturnsController).
  //
  // Roles method-level MENIMPA class-level (RolesGuard pakai
  // reflector.getAllAndOverride([handler, class]), handler diperiksa
  // duluan) — OPERATOR butuh ini untuk memilih akun kas saat membuat Retur
  // Pembelian settlementType=CASH (Hari 16), padahal endpoint COA lain
  // tetap MASTER+SUPERVISOR saja.
  @Roles(Role.MASTER, Role.SUPERVISOR, Role.OPERATOR)
  @Get('cash-accounts')
  findCashAccounts() {
    return this.chartOfAccountsService.findCashAccounts();
  }

  @Get()
  findAll() {
    return this.chartOfAccountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chartOfAccountsService.findOne(id);
  }

  // Hari 18 — CRUD penuh MASTER saja (CLAUDE.md §5 Permission Matrix:
  // POST/PATCH/DELETE /chart-of-accounts -> MASTER, SUPERVISOR & OPERATOR
  // 403). Tidak ada rute DELETE (CLAUDE.md §2.1 "tidak ada hard-delete") —
  // nonaktifkan akun lewat PATCH { isActive: false }, pola sama
  // brands/customers/units.
  @Roles(Role.MASTER)
  @Audit('CREATE', 'chart_of_accounts')
  @Post()
  create(@Body() dto: CreateChartOfAccountDto) {
    return this.chartOfAccountsService.create(dto);
  }

  @Roles(Role.MASTER)
  @Audit('UPDATE', 'chart_of_accounts')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChartOfAccountDto) {
    return this.chartOfAccountsService.update(id, dto);
  }
}
