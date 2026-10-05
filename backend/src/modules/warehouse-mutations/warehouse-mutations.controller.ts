import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateWarehouseMutationDto } from './dto/create-warehouse-mutation.dto';
import { WarehouseMutationQueryDto } from './dto/warehouse-mutation-query.dto';
import { WarehouseMutationsService } from './warehouse-mutations.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('warehouse-mutations')
export class WarehouseMutationsController {
  constructor(
    private readonly warehouseMutationsService: WarehouseMutationsService,
  ) {}

  @Get()
  findAll(@Query() query: WarehouseMutationQueryDto) {
    return this.warehouseMutationsService.findAll(query);
  }

  // Dua endpoint di bawah HARUS terdaftar sebelum @Get(':id') — path literal
  // 'titipan-faktur' akan tertelan oleh ':id' kalau urutannya ditukar.
  //
  // Layar Entri Mutasi Titipan (gudang/mutasi/index.vue, paket R8 K7): daftar
  // faktur POSTED milik pelanggan yang masih punya sisa qty belum dititip.
  @Get('titipan-faktur')
  findTitipanFakturForCustomer(@Query('customerId') customerId: string) {
    return this.warehouseMutationsService.findTitipanFakturForCustomer(
      customerId,
    );
  }

  // Baris satu faktur + qty sudah dititip + sisa — sumber tunggal yang sama
  // dengan assertTitipanQtyWithinInvoiceLine() di service, supaya FE tidak
  // pernah menampilkan sisa yang berbeda dari yang divalidasi saat submit.
  @Get('titipan-faktur/:invoiceId/lines')
  findTitipanFakturLines(@Param('invoiceId') invoiceId: string) {
    return this.warehouseMutationsService.findTitipanFakturLines(invoiceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehouseMutationsService.findOne(id);
  }

  // CLAUDE.md §5 permission matrix "Mutasi Gudang": MASTER + OPERATOR, tidak
  // SUPERVISOR (pola sama WarehousesController).
  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'warehouse_mutations')
  @Post()
  create(@Body() dto: CreateWarehouseMutationDto, @Req() req: RequestWithUser) {
    // Header dibaca manual (bukan lewat StepUpGuard/@RequiresStepUp) karena
    // syarat step-up di sini bergantung ISI mutasi (arah gudang), bukan
    // sekadar role+endpoint — StepUpService.requireApproval() dipanggil dari
    // dalam service (pola sama step-up.guard.ts:49-50).
    const headerId = req.headers['x-authorization-request-id'];
    const authorizationRequestId = Array.isArray(headerId)
      ? headerId[0]
      : headerId;
    return this.warehouseMutationsService.create(
      dto,
      req.user,
      authorizationRequestId,
    );
  }
}
