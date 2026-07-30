import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResetDocumentCountersForNewFormat1785080602923 implements MigrationInterface {
  name = 'ResetDocumentCountersForNewFormat1785080602923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Format nomor berubah total (CLAUDE.md §2.3: dari format lama berbasis
    // prefix+periode+urutan ke KODE/{store_code}-YYMMXXXX). Counter lama
    // (mis. SALES_INVOICE/2609 dari test Hari 3) tidak valid lagi di format
    // baru — di-truncate, bukan dipetakan ulang.
    // Aman: last_number di sini cuma penunjuk "nomor terakhir terbit", bukan
    // dokumen itu sendiri, dan belum ada satu pun dokumen sungguhan (faktur,
    // dll) yang terbit dengan nomor lama.
    await queryRunner.query(`TRUNCATE TABLE document_counters;`);
  }

  public async down(): Promise<void> {
    // Sengaja no-op — data yang di-truncate (last_number lama format usang)
    // memang tidak seharusnya dipulihkan.
  }
}
