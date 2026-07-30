import { Module } from '@nestjs/common';
import { ArAccountResolverService } from './ar-account-resolver.service';

@Module({
  providers: [ArAccountResolverService],
  exports: [ArAccountResolverService],
})
export class ReceivablesModule {}
