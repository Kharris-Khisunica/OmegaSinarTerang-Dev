import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { SubmitOpeningBalanceDto } from './dto/submit-opening-balance.dto';
import { OpeningBalanceService } from './opening-balance.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// MASTER only (CLAUDE.md §5 Permission Matrix, baris "Saldo Awal, Settings").
@Controller('opening-balance')
@Roles(Role.MASTER)
export class OpeningBalanceController {
  constructor(private readonly openingBalanceService: OpeningBalanceService) {}

  @Audit('POST_OPENING_BALANCE', 'opening_balance')
  @Post()
  submit(@Body() dto: SubmitOpeningBalanceDto, @Req() req: RequestWithUser) {
    return this.openingBalanceService.submit(dto, req.user.sub);
  }

  @Get('verify')
  verify() {
    return this.openingBalanceService.verify();
  }
}
