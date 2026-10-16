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
import { CreateDeliveryOrderDto } from './dto/create-delivery-order.dto';
import { DeliveryOrderQueryDto } from './dto/delivery-order-query.dto';
import { UpdateDeliveryOrderStatusDto } from './dto/update-delivery-order-status.dto';
import { VoidDeliveryOrderDto } from './dto/void-delivery-order.dto';
import { DeliveryOrdersService } from './delivery-orders.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('delivery-orders')
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrdersService: DeliveryOrdersService) {}

  // Daftar "belum terkirim" (Hari 25) DIPAKAI ULANG lewat
  // ?deliveryStatus=POSTPONED — tidak ada endpoint terpisah (KONTEKS_REVISI
  // §2.2, pola sama Pengecekan Invoice Harian).
  @Get()
  findAll(@Query() query: DeliveryOrderQueryDto) {
    return this.deliveryOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryOrdersService.findOne(id);
  }

  // CLAUDE.md §5: Surat Jalan (write) MASTER+OPERATOR, SUPERVISOR 403.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'delivery_orders')
  @Post()
  create(@Body() dto: CreateDeliveryOrderDto, @Req() req: RequestWithUser) {
    return this.deliveryOrdersService.create(dto, req.user);
  }

  // Cetak ulang identik bebas tanpa izin (CLAUDE.md §2.16).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('PRINT', 'delivery_orders')
  @Post(':id/print')
  print(@Param('id') id: string) {
    return this.deliveryOrdersService.registerPrint(id);
  }

  // Status kirim BEBAS kunci cetak (need_fixing.md #18) — tidak ada header
  // step-up di sini lagi.
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('EDIT', 'delivery_orders')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryOrderStatusDto,
  ) {
    return this.deliveryOrdersService.updateStatus(id, dto);
  }

  // DUA header independen, pola sama SalesInvoicesController.voidInvoice():
  //   x-authorization-request-id       -> UNLOCK_PRINT (§2.16)
  //   x-void-authorization-request-id  -> VOID_DOCUMENT (§2.13, OPERATOR)
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('VOID', 'delivery_orders')
  @Post(':id/void')
  voidDeliveryOrder(
    @Param('id') id: string,
    @Body() dto: VoidDeliveryOrderDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    const voidHeaderId = req.headers['x-void-authorization-request-id'];
    const voidAuthorizationRequestId = Array.isArray(voidHeaderId)
      ? voidHeaderId[0]
      : voidHeaderId;
    return this.deliveryOrdersService.voidDeliveryOrder(
      id,
      dto,
      req.user,
      authorizationRequestId,
      voidAuthorizationRequestId,
    );
  }
}
