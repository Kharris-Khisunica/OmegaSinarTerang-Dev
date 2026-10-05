import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { BadStockLotsQueryDto } from './dto/bad-stock-lots-query.dto';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnQueryDto } from './dto/purchase-return-query.dto';
import { PurchaseReturnsService } from './purchase-returns.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(
    private readonly purchaseReturnsService: PurchaseReturnsService,
  ) {}

  // WAJIB dideklarasikan SEBELUM @Get(':id') — kalau kebalik, Nest akan
  // menangkap "bad-stock" sebagai nilai :id. Alur WAJIB "pilih supplier
  // dulu" (CLAUDE.md §3 "Bad stock").
  @Get('bad-stock')
  findBadStockLots(@Query() query: BadStockLotsQueryDto) {
    return this.purchaseReturnsService.findBadStockLots(query.supplierId);
  }

  @Get()
  findAll(@Query() query: PurchaseReturnQueryDto) {
    return this.purchaseReturnsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseReturnsService.findOne(id);
  }

  // CLAUDE.md §5: Retur (write) MASTER+OPERATOR, SUPERVISOR 403.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'purchase_returns')
  @Post()
  create(@Body() dto: CreatePurchaseReturnDto, @Req() req: RequestWithUser) {
    return this.purchaseReturnsService.create(dto, req.user);
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'purchase_returns')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.purchaseReturnsService.registerPrint(id);
  }
}
