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
import { BadStockLotsQueryDto } from './dto/bad-stock-lots-query.dto';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnQueryDto } from './dto/purchase-return-query.dto';
import { RevisePurchaseReturnDto } from './dto/revise-purchase-return.dto';
import { VoidPurchaseReturnDto } from './dto/void-purchase-return.dto';
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

  // need_fixing.md #19 — DUA header independen, pola Faktur Penjualan:
  //   x-authorization-request-id       -> UNLOCK_PRINT (§2.16)
  //   x-void-authorization-request-id  -> VOID_DOCUMENT (§2.13, OPERATOR)
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'purchase_returns')
  @Post(':id/void')
  voidReturn(
    @Param('id') id: string,
    @Body() dto: VoidPurchaseReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseReturnsService.voidReturn(
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
  @Audit('REVISE', 'purchase_returns')
  @Patch(':id/revise')
  revise(
    @Param('id') id: string,
    @Body() dto: RevisePurchaseReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseReturnsService.reviseReturn(
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
