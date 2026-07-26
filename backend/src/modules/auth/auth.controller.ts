import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Audit } from '../audit/decorators/audit.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { AuthenticatedUser } from './types/jwt-payload.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

interface RequestWithAudit extends Request {
  auditUserId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Audit('LOGIN', 'users')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: RequestWithAudit) {
    const user = await this.authService.validateCredentials(
      dto.username,
      dto.password,
    );
    req.auditUserId = user.id;
    const tokens = await this.authService.issueTokens(user);
    return { ...tokens, user: this.authService.sanitize(user) };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: RequestWithUser) {
    await this.authService.logout(req.user.sub);
    return { success: true };
  }

  @Get('me')
  me(@Req() req: RequestWithUser) {
    return this.authService.getProfile(req.user.sub);
  }

  // Verifikasi RolesGuard hari ini. Ganti dengan endpoint MASTER-only sungguhan
  // begitu Settings/COA (Hari 4/6) ada, lalu hapus route ini.
  @Roles(Role.MASTER)
  @Get('master-only')
  masterOnlyPing() {
    return { ok: true };
  }
}
