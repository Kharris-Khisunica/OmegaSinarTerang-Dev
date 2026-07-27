import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductUnitConversion])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
