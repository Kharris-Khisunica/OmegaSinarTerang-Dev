import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { SalesReturnQueryDto } from './dto/sales-return-query.dto';
import { SalesReturnsService } from './sales-returns.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  findAll(@Query() query: SalesReturnQueryDto) {
    return this.salesReturnsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(id);
  }

  // CLAUDE.md §5: Retur (write) MASTER+OPERATOR, SUPERVISOR 403.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'sales_returns')
  @Post()
  create(@Body() dto: CreateSalesReturnDto, @Req() req: RequestWithUser) {
    return this.salesReturnsService.create(dto, req.user);
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'sales_returns')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.salesReturnsService.registerPrint(id);
  }
}
