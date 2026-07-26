import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface LoginRequest {
  ip?: string;
  body?: { username?: unknown };
}

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: LoginRequest): Promise<string> {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.toLowerCase()
        : 'unknown';
    return Promise.resolve(`${req.ip}-${username}`);
  }

  protected getErrorMessage(): Promise<string> {
    return Promise.resolve(
      'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
    );
  }
}
