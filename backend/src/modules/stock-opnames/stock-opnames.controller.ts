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
import { SaveStockOpnameDto } from './dto/save-stock-opname.dto';
import { StockOpnameQueryDto } from './dto/stock-opname-query.dto';
import { VoidStockOpnameDto } from './dto/void-stock-opname.dto';
import { StockOpnamesService } from './stock-opnames.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// need_fixing.md #25 — akses sama dengan worksheet Stok Opname (R11/L1):
// MASTER+SUPERVISOR membaca & menyimpan hitungan. POSTING (= persetujuan
// koreksi stok + jurnal) dan VOID hanya MASTER.
@Roles(Role.MASTER, Role.SUPERVISOR)
@Controller('stock-opnames')
export class StockOpnamesController {
  constructor(private readonly stockOpnamesService: StockOpnamesService) {}

  @Get()
  findAll(@Query() query: StockOpnameQueryDto) {
    return this.stockOpnamesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockOpnamesService.findOne(id);
  }

  @Audit('CREATE', 'stock_opnames')
  @Post()
  create(@Body() dto: SaveStockOpnameDto, @Req() req: RequestWithUser) {
    return this.stockOpnamesService.create(dto, req.user);
  }

  @Audit('EDIT', 'stock_opnames')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SaveStockOpnameDto) {
    return this.stockOpnamesService.update(id, dto);
  }

  @Roles(Role.MASTER)
  @Audit('POST', 'stock_opnames')
  @Post(':id/post')
  post(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.stockOpnamesService.post(id, req.user);
  }

  @Roles(Role.MASTER)
  @Audit('VOID', 'stock_opnames')
  @Post(':id/void')
  voidOpname(
    @Param('id') id: string,
    @Body() dto: VoidStockOpnameDto,
    @Req() req: RequestWithUser,
  ) {
    return this.stockOpnamesService.voidOpname(id, dto, req.user);
  }
}
