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
import { CashTransfersService } from './cash-transfers.service';
import { CashTransferQueryDto } from './dto/cash-transfer-query.dto';
import { CreateCashTransferDto } from './dto/create-cash-transfer.dto';
import { ReviewCashTransferDto } from './dto/review-cash-transfer.dto';
import { VoidCashTransferDto } from './dto/void-cash-transfer.dto';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('cash-transfers')
export class CashTransfersController {
  constructor(private readonly cashTransfersService: CashTransfersService) {}

  @Get()
  findAll(@Query() query: CashTransferQueryDto) {
    return this.cashTransfersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cashTransfersService.findOne(id);
  }

  // CLAUDE.md §3 "Pindah Buku Kas": MASTER+OPERATOR, SUPERVISOR 403 write.
  // TIDAK ada StepUpService/CASH_OUTFLOW di sini meski salah satu akun Kas
  // Besar (requires_outflow_approval) — pemindahan antar kas milik sendiri,
  // approval-nya setelah-fakta lewat review().
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'cash_transfers')
  @Post()
  create(@Body() dto: CreateCashTransferDto, @Req() req: RequestWithUser) {
    return this.cashTransfersService.create(dto, req.user);
  }

  // x-void-authorization-request-id -> VOID_DOCUMENT (§2.13, hanya OPERATOR).
  // Tidak ada gerbang UNLOCK_PRINT (cash_transfers tidak ikut kunci cetak).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'cash_transfers')
  @Post(':id/void')
  voidTransfer(
    @Param('id') id: string,
    @Body() dto: VoidCashTransferDto,
    @Req() req: RequestWithUser,
  ) {
    const voidHeaderId = req.headers['x-void-authorization-request-id'];
    const voidAuthorizationRequestId = Array.isArray(voidHeaderId)
      ? voidHeaderId[0]
      : voidHeaderId;
    return this.cashTransfersService.voidTransfer(
      id,
      dto,
      req.user,
      voidAuthorizationRequestId,
    );
  }

  // Approval setelah-fakta (CLAUDE.md §3 "Biaya Operasional") — SUPERVISOR
  // sengaja masuk whitelist di sini (beda dari create()/voidTransfer() di
  // atas), pola sama SalesInvoicesController.review().
  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('REVIEW', 'cash_transfers')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewCashTransferDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cashTransfersService.review(id, dto, req.user);
  }
}
