import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

// need_fixing.md #24 — manajemen user, MASTER-only. Field bernama `password`
// (bukan newPassword dsb.) supaya disaring stripSecrets() dari audit_logs
// (CLAUDE.md §2.12).
export class CreateUserDto {
  @IsString()
  @Matches(/^[a-z0-9._-]{3,32}$/, {
    message:
      'Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus.',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter.' })
  password: string;
}
