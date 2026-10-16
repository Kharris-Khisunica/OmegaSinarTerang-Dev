import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateKasbonRepaymentDto } from './dto/create-kasbon-repayment.dto';
import { KasbonRepaymentQueryDto } from './dto/kasbon-repayment-query.dto';
import { VoidKasbonRepaymentDto } from './dto/void-kasbon-repayment.dto';
import { KasbonRepaymentsService } from './kasbon-repayments.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// need_fixing.md #26 — Pelunasan Kasbon. Write MASTER+OPERATOR (pola Biaya
// Operasional, CLAUDE.md §5), baca semua role.
@Controller('kasbon-repayments')
export class KasbonRepaymentsController {
  constructor(
    private readonly kasbonRepaymentsService: KasbonRepaymentsService,
  ) {}

  @Get()
  findAll(@Query() query: KasbonRepaymentQueryDto) {
    return this.kasbonRepaymentsService.findAll(query);
  }

  // Didaftarkan SEBELUM ':id' — kalau tidak, 'balances' tertelan sebagai :id.
  @Get('balances')
  getBalances(@Query('workerId') workerId?: string) {
    return this.kasbonRepaymentsService.getBalances(workerId || undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kasbonRepaymentsService.findOne(id);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'kasbon_repayments')
  @Post()
  create(@Body() dto: CreateKasbonRepaymentDto, @Req() req: RequestWithUser) {
    return this.kasbonRepaymentsService.create(dto, req.user);
  }

  // x-void-authorization-request-id -> VOID_DOCUMENT (§2.13, hanya OPERATOR).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'kasbon_repayments')
  @Post(':id/void')
  voidRepayment(
    @Param('id') id: string,
    @Body() dto: VoidKasbonRepaymentDto,
    @Req() req: RequestWithUser,
  ) {
    const voidHeaderId = req.headers['x-void-authorization-request-id'];
    const voidAuthorizationRequestId = Array.isArray(voidHeaderId)
      ? voidHeaderId[0]
      : voidHeaderId;
    return this.kasbonRepaymentsService.voidRepayment(
      id,
      dto,
      req.user,
      voidAuthorizationRequestId,
    );
  }
}
