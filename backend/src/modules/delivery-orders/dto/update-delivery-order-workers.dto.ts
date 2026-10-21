import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Ganti daftar pekerja surat jalan (Hari 44). BEBAS kunci cetak — pola sama
// UpdateDeliveryOrderStatusDto (need_fixing.md #18); jejaknya di audit_logs.
export class UpdateDeliveryOrderWorkersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Pilih minimal satu pekerja.' })
  @ArrayUnique({ message: 'Pekerja tidak boleh dipilih dua kali.' })
  @IsUUID('4', { each: true })
  workerIds: string[];
}
