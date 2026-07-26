import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload.interface';

const BCRYPT_COST = 10;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SanitizedUser {
  id: string;
  username: string;
  fullName: string;
  role: User['role'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(username: string, password: string): Promise<User> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Username atau password salah.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Username atau password salah.');
    }

    return user;
  }

  async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.signToken(
      user,
      'access',
      ACCESS_TOKEN_TTL_SECONDS,
      this.accessSecret(),
    );
    const refreshToken = await this.signToken(
      user,
      'refresh',
      REFRESH_TOKEN_TTL_SECONDS,
      this.refreshSecret(),
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_COST);
    await this.usersService.setRefreshTokenHash(user.id, refreshTokenHash);

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.refreshSecret(),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau kedaluwarsa.',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token tidak valid.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException(
        'Sesi sudah berakhir, silakan login kembali.',
      );
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException(
        'Sesi sudah berakhir, silakan login kembali.',
      );
    }

    return this.issueTokens(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan.');
    }
    return this.sanitize(user);
  }

  sanitize(user: User): SanitizedUser {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private signToken(
    user: User,
    type: JwtPayload['type'],
    expiresInSeconds: number,
    secret: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      type,
    };
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds,
    });
  }

  private accessSecret(): string {
    return this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'dev-access-secret',
    );
  }

  private refreshSecret(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret',
    );
  }
}
