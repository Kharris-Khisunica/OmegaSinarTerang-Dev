import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter.' })
  password: string;
}
