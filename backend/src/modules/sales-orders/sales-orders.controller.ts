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
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrdersService } from './sales-orders.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// CLAUDE.md §5: Sales Order write MASTER+OPERATOR, SUPERVISOR 403. Tidak
// ada endpoint hapus (§2.1, tidak ada hard-delete), tidak ada /:id/print, tidak
// ada /:id/void, tidak ada /:id/convert-to-invoice — SO dikecualikan dari
// kunci cetak (§2.16) dan konversi ke faktur adalah primitif internal
// (SalesOrdersService.markConverted()) dipanggil Hari 21, bukan endpoint
// publik hari ini (belum ada tabel sales_invoices untuk dihasilkan).
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  findAll(@Query() query: SalesOrderQueryDto) {
    return this.salesOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'sales_orders')
  @Post()
  create(@Body() dto: CreateSalesOrderDto, @Req() req: RequestWithUser) {
    return this.salesOrdersService.create(dto, req.user);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('EDIT', 'sales_orders')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  // need_fixing.md #20 — batalkan SO yang tidak jadi (bukan VOID, bukan hapus).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CANCEL', 'sales_orders')
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSalesOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesOrdersService.cancel(id, dto, req.user);
  }
}
