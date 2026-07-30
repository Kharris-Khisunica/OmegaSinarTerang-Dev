import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoreIdentityToSettings1785080602921 implements MigrationInterface {
  name = 'AddStoreIdentityToSettings1785080602921';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Pembulatan dicabut (CLAUDE.md §2.10) — setting ini sudah mati.
    await queryRunner.query(
      `DELETE FROM settings WHERE key = 'rounding_multiple';`,
    );

    // Identitas toko (CLAUDE.md §2.3) — dipakai generator nomor dokumen
    // (store_code) dan kepala nota (nama/kota/telepon, yang kosong tidak
    // dicetak). RM01 adalah kode toko nyata klien.
    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type) VALUES
      ('store_code', 'RM01', 'STRING'),
      ('store_name', '', 'STRING'),
      ('store_city', '', 'STRING'),
      ('store_phone', '', 'STRING'),
      ('cash_outflow_approval_threshold', '0', 'NUMBER');
    `);

    // default_ar_account_id (CLAUDE.md §3) — NULL di customers.ar_account_id
    // jatuh ke sini. Diisi langsung ke id akun "Piutang Usaha" (1102) yang
    // sudah di-seed sejak Hari 3, supaya setting ini berfungsi sejak awal
    // alih-alih dibiarkan kosong menunggu Master mengisi manual.
    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type)
      SELECT 'default_ar_account_id', id::text, 'STRING'
      FROM chart_of_accounts WHERE code = '1102';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM settings WHERE key IN (
        'store_code', 'store_name', 'store_city', 'store_phone',
        'cash_outflow_approval_threshold', 'default_ar_account_id'
      );
    `);

    await queryRunner.query(`
      INSERT INTO settings (key, value, value_type) VALUES
      ('rounding_multiple', '100', 'NUMBER');
    `);
  }
}
