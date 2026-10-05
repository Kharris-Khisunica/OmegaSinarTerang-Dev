import { MigrationInterface, QueryRunner } from 'typeorm';

// Paket R5 (docs/RENCANA_REVISI_TESTING_KLIEN.md §2B asumsi A1, FP3) —
// klien: "Dalam penjualan, tidak ada diskon penjualan. Drop." Harga sudah
// diketik bebas per pelanggan (CLAUDE.md §3), jadi diskon jadi jalur kedua
// untuk hal yang sama.
//
// '04.110.00003' Diskon Penjualan DINONAKTIFKAN, BUKAN dihapus — jurnal
// faktur LAMA (sebelum paket ini) masih menunjuk ke akun ini lewat
// journal_entry_lines.account_id, dan laporan/buku besar periode lalu harus
// tetap bisa dibaca. SalesInvoicesService.create() sekarang menolak diskon
// != 0 di DTO (lihat create-sales-invoice.dto.ts/create-sales-invoice-line
// .dto.ts), jadi baris jurnal "Diskon Penjualan" tidak akan pernah terbentuk
// lagi untuk faktur baru — is_active=false aman, resolveSingleActive() untuk
// flag is_sales_discount_account tidak akan pernah dipanggil lagi
// (totalDiscountCents > 0 tidak akan pernah true).
export class DeactivateSalesDiscountAccount1785080602966 implements MigrationInterface {
  name = 'DeactivateSalesDiscountAccount1785080602966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_active = false WHERE code = '04.110.00003';`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE chart_of_accounts SET is_active = true WHERE code = '04.110.00003';`,
    );
  }
}
