import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { AuthorizationRequestsService } from './authorization-requests.service';
import { RequiresStepUp } from './decorators/requires-step-up.decorator';
import { CreateAuthorizationRequestDto } from './dto/create-authorization-request.dto';
import { RejectAuthorizationRequestDto } from './dto/reject-authorization-request.dto';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

@Controller('authorization-requests')
export class AuthorizationRequestsController {
  constructor(
    private readonly authorizationRequestsService: AuthorizationRequestsService,
  ) {}

  @Audit('CREATE', 'authorization_requests')
  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() dto: CreateAuthorizationRequestDto,
  ) {
    return this.authorizationRequestsService.create(req.user, dto);
  }

  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Get()
  findPending() {
    return this.authorizationRequestsService.findPending();
  }

  // Tidak di-@Roles — dibatasi kepemilikan di bawah, bukan role. Ini yang
  // dipoll <StepUpDialog> (FE Hari 10) untuk tahu status permintaannya
  // sendiri (APPROVED/REJECTED/EXPIRED) tanpa perlu akses GET / yang
  // MASTER/SUPERVISOR-only.
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const found = await this.authorizationRequestsService.findOneOrFail(id);
    const isOwner = found.requesterId === req.user.sub;
    const isReviewer =
      req.user.role === Role.MASTER || req.user.role === Role.SUPERVISOR;
    if (!isOwner && !isReviewer) {
      throw new ForbiddenException(
        'Anda tidak berhak melihat permintaan otorisasi ini.',
      );
    }
    return found;
  }

  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('APPROVE', 'authorization_requests')
  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.authorizationRequestsService.approve(id, req.user);
  }

  @Roles(Role.MASTER, Role.SUPERVISOR)
  @Audit('REJECT', 'authorization_requests')
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectAuthorizationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authorizationRequestsService.reject(id, req.user, dto.reason);
  }

  // Endpoint sementara HANYA untuk membuktikan StepUpGuard end-to-end hari ini
  // (lihat authorization-requests.spec.ts). Ganti dengan aksi step-up
  // sungguhan begitu VOID Sales Invoice/dll ada (Hari 12/19+), lalu HAPUS ini.
  @RequiresStepUp('TEST_STEP_UP_ACTION')
  @Post('test-step-up-action')
  testStepUpAction(@Req() req: RequestWithUser) {
    return { ok: true, executedBy: req.user.sub };
  }
}
