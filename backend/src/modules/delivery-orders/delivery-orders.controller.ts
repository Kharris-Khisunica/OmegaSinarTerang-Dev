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

  // Header dibaca manual (bukan lewat StepUpGuard/@RequiresStepUp) — syarat
  // step-up di sini bergantung print_status dokumen, bukan sekadar
  // role+endpoint (pola identik PurchaseInvoicesController.update()).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('EDIT', 'delivery_orders')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.deliveryOrdersService.updateStatus(
      id,
      dto,
      req.user,
      authorizationRequestId,
    );
  }
}
