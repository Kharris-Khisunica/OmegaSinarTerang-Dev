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
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { ReviseSalesReturnDto } from './dto/revise-sales-return.dto';
import { SalesReturnQueryDto } from './dto/sales-return-query.dto';
import { VoidSalesReturnDto } from './dto/void-sales-return.dto';
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

  // need_fixing.md #19 — DUA header independen, pola Faktur Penjualan:
  //   x-authorization-request-id       -> UNLOCK_PRINT (§2.16)
  //   x-void-authorization-request-id  -> VOID_DOCUMENT (§2.13, OPERATOR)
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'sales_returns')
  @Post(':id/void')
  voidReturn(
    @Param('id') id: string,
    @Body() dto: VoidSalesReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesReturnsService.voidReturn(
      id,
      dto,
      req.user,
      headerValue(req, 'x-authorization-request-id'),
      headerValue(req, 'x-void-authorization-request-id'),
    );
  }

  // Revisi-di-tempat (§2.16a): x-authorization-request-id -> UNLOCK_PRINT
  // intent EDIT, hanya kalau retur sudah PRINTED.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('REVISE', 'sales_returns')
  @Patch(':id/revise')
  revise(
    @Param('id') id: string,
    @Body() dto: ReviseSalesReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesReturnsService.reviseReturn(
      id,
      dto,
      req.user,
      headerValue(req, 'x-authorization-request-id'),
    );
  }
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
