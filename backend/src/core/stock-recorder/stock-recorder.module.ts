import { Module } from '@nestjs/common';
import { ProductsModule } from '../../modules/products/products.module';
import { StockRecorderService } from './stock-recorder.service';

@Module({
  imports: [ProductsModule],
  providers: [StockRecorderService],
  exports: [StockRecorderService],
})
export class StockRecorderModule {}
