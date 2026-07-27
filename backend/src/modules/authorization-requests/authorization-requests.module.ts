import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationRequestsController } from './authorization-requests.controller';
import { AuthorizationRequestsService } from './authorization-requests.service';
import { AuthorizationRequest } from './entities/authorization-request.entity';
import { StepUpGuard } from './guards/step-up.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorizationRequest])],
  controllers: [AuthorizationRequestsController],
  providers: [
    AuthorizationRequestsService,
    { provide: APP_GUARD, useClass: StepUpGuard },
  ],
  exports: [AuthorizationRequestsService],
})
export class AuthorizationRequestsModule {}
