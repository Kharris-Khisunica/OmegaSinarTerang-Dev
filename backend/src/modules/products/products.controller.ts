import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // Murni informatif (CLAUDE.md §2.16/§3) — qty terikat Sales Order OPEN,
  // tidak pernah mengurangi stok tersedia di layar mana pun.
  @Get(':id/committed-qty')
  async getCommittedQty(@Param('id') id: string) {
    const committedQtyBaseUnit = await this.productsService.getCommittedQty(id);
    return { productId: id, committedQtyBaseUnit };
  }

  // Cermin baca gudang STORE (CLAUDE.md §2.5) — dipakai panel "SISA STOK"
  // Faktur Penjualan (Hari 20).
  @Get(':id/stock-balance')
  async getStockBalance(@Param('id') id: string) {
    const qtyBaseUnit = await this.productsService.getStockBalance(id);
    return { productId: id, qtyBaseUnit };
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'products')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('UPDATE', 'products')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
}
