import { Module } from '@nestjs/common';
import { AuthorizationRequestsModule } from '../../modules/authorization-requests/authorization-requests.module';
import { StepUpService } from './step-up.service';

@Module({
  imports: [AuthorizationRequestsModule],
  providers: [StepUpService],
  exports: [StepUpService],
})
export class StepUpModule {}
