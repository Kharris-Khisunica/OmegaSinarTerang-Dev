import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Alasan penolakan wajib diisi Supervisor/Master (dipakai FE Hari 10 —
 * halaman Antrian Persetujuan) supaya operator yang requestnya ditolak tahu
 * kenapa, bukan cuma "ditolak" tanpa konteks.
 */
export class RejectAuthorizationRequestDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
