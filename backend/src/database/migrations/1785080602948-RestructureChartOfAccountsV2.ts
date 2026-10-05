import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hari 17A — Restrukturisasi Bagan Akun (docs/COA_USULAN.md,
 * docs/COA_Usulan_OmegaSinarTerang.xlsx lembar "Bagan Akun"). Daftar akun
 * SUDAH FINAL dan direkonsiliasi ke laporan Juli klien (18 titik cocok) —
 * migration ini memindahkannya ke database, tidak menyusun ulang.
 *
 * 13 akun lama (seed 1785080602909 + 1785080602922) di-UPDATE, BUKAN
 * dihapus lalu dibuat ulang — id WAJIB bertahan karena journal_entry_lines,
 * customers.ar_account_id, dan settings.default_ar_account_id sudah
 * menunjuk ke id itu (COA_USULAN §4). 95 baris baru (7 Grup + 19 Kategori +
 * 69 Jenis) di-INSERT untuk melengkapi 108 baris Versi A. Lima akun
 * `06.130.*` (Beban Pribadi Pemilik, Versi B) SENGAJA tidak ada di sini —
 * lihat src/database/migrations-versi-b-pending/.
 *
 * Baris Grup (tingkat G) tidak punya "Kelompok Laporan"/"Saldo Normal" di
 * sumber (mereka mencampur beberapa subtype) dan is_postable=false untuk
 * semuanya — account_subtype/normal_balance yang dipasang di sini murni
 * memenuhi NOT NULL, TIDAK dipakai logika apa pun (tidak ada jurnal yang
 * bisa menunjuk ke header).
 */
export class RestructureChartOfAccountsV21785080602948 implements MigrationInterface {
  name = 'RestructureChartOfAccountsV21785080602948';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE normal_balance AS ENUM ('DEBIT', 'CREDIT');
    `);
    await queryRunner.query(`
      CREATE TYPE account_subtype AS ENUM (
        'CURRENT_ASSET', 'FIXED_ASSET', 'ACCUMULATED_DEPRECIATION', 'NON_OPERATING_ASSET',
        'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_OPERATING_LIABILITY',
        'EQUITY', 'CONTRA_EQUITY',
        'REVENUE', 'CONTRA_REVENUE',
        'COGS', 'SELLING_EXPENSE', 'ADMIN_EXPENSE', 'OWNER_EXPENSE',
        'OTHER_INCOME', 'OTHER_EXPENSE'
      );
    `);

    // Nullable dulu — 108 baris diisi dalam migration yang sama, NOT NULL
    // dipasang di langkah terakhir setelah semuanya terisi.
    // requires_outflow_approval SUDAH ADA sejak 1785080602945 (Hari 17) —
    // bukan kolom baru di sini, hanya dipakai baris kas/bank yang baru.
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        ADD COLUMN normal_balance normal_balance,
        ADD COLUMN account_subtype account_subtype,
        ADD COLUMN is_postable BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN is_opening_balance_equity_account BOOLEAN NOT NULL DEFAULT false;
    `);

    // ── 1) UPDATE 13 akun lama — id bertahan, hanya code/name/atribut berubah ──
    await queryRunner.query(`
    UPDATE chart_of_accounts SET
      code = '01.120.00001',
      name = 'Piutang Usaha',
      normal_balance = 'DEBIT',
      account_subtype = 'CURRENT_ASSET',
      is_postable = true
      WHERE code = '1102';

    UPDATE chart_of_accounts SET
      code = '01.130.00001',
      name = 'Persediaan Barang Dagang',
      normal_balance = 'DEBIT',
      account_subtype = 'CURRENT_ASSET',
      is_postable = true
      WHERE code = '1101';

    UPDATE chart_of_accounts SET
      code = '01.150.00001',
      name = 'PPN Masukan',
      normal_balance = 'DEBIT',
      account_subtype = 'CURRENT_ASSET',
      is_postable = true
      WHERE code = '1103';

    UPDATE chart_of_accounts SET
      code = '02.110.00001',
      name = 'Hutang Usaha',
      normal_balance = 'CREDIT',
      account_subtype = 'CURRENT_LIABILITY',
      is_postable = true
      WHERE code = '2101';

    UPDATE chart_of_accounts SET
      code = '02.110.00022',
      name = 'PPN Keluaran',
      normal_balance = 'CREDIT',
      account_subtype = 'CURRENT_LIABILITY',
      is_postable = true
      WHERE code = '2102';

    UPDATE chart_of_accounts SET
      code = '03.110.00001',
      name = 'Modal Pemilik',
      normal_balance = 'CREDIT',
      account_subtype = 'EQUITY',
      is_postable = true,
      is_opening_balance_equity_account = true
      WHERE code = '3101';

    UPDATE chart_of_accounts SET
      code = '04.110.00001',
      name = 'Penjualan Barang Dagang',
      normal_balance = 'CREDIT',
      account_subtype = 'REVENUE',
      is_postable = true
      WHERE code = '4101';

    UPDATE chart_of_accounts SET
      code = '04.110.00002',
      name = 'Retur Penjualan',
      normal_balance = 'DEBIT',
      account_subtype = 'CONTRA_REVENUE',
      is_postable = true
      WHERE code = '4103';

    UPDATE chart_of_accounts SET
      code = '04.110.00003',
      name = 'Diskon Penjualan',
      normal_balance = 'DEBIT',
      account_subtype = 'CONTRA_REVENUE',
      is_postable = true
      WHERE code = '4104';

    UPDATE chart_of_accounts SET
      code = '05.110.00001',
      name = 'Harga Pokok Penjualan',
      normal_balance = 'DEBIT',
      account_subtype = 'COGS',
      is_postable = true
      WHERE code = '5101';

    UPDATE chart_of_accounts SET
      code = '06.120.00099',
      name = 'B. Umum dan Administrasi Lainnya',
      normal_balance = 'DEBIT',
      account_subtype = 'ADMIN_EXPENSE',
      is_postable = true
      WHERE code = '5102';

    -- account_type EXPENSE -> INCOME: Selisih Retur Pembelian pindah dari
    -- "Beban Lain-lain" ke "Pendapatan Lain-lain" (COA_USULAN §4).
    UPDATE chart_of_accounts SET
      code = '07.110.00004',
      name = 'Selisih Retur Pembelian',
      account_type = 'INCOME',
      normal_balance = 'CREDIT',
      account_subtype = 'OTHER_INCOME',
      is_postable = true
      WHERE code = '5104';

    UPDATE chart_of_accounts SET
      code = '07.210.00004',
      name = 'Selisih Pembayaran',
      normal_balance = 'DEBIT',
      account_subtype = 'OTHER_EXPENSE',
      is_postable = true
      WHERE code = '5103';
    `);

    // ── 1b) Bersihkan 11 akun placeholder 52xx (migration 1785080602947,
    // Hari 17 pagi — sama hari dengan Hari 17A). Migration itu sendiri
    // menulis eksplisit "MASTER memperbaikinya sendiri lewat CRUD COA Hari
    // 18" karena daftar akun 08.xxx Affari asli belum didapat SAAT ITU —
    // sorenya bagan final (COA_USULAN) sudah ada dan menggantikannya
    // (mis. 5201 "Gaji Harian Tukang Angkut" == 06.110.00002 "B. Upah
    // Tukang Angkut"). Dicek dulu sebelum menulis migration ini: 0 baris
    // journal_entry_lines memakainya, jadi aman DIHAPUS (bukan sekadar
    // dinonaktifkan) — pola sama 1785080602922 (akun Pendapatan Pembulatan).
    // Kalau dibiarkan, 11 baris ini jadi akun EXPENSE yatim di luar pohon
    // Grup/Kategori (parent_id NULL) yang meniadakan tujuan restrukturisasi
    // hari ini. down() mengembalikannya persis seperti seed 947 semula.
    await queryRunner.query(`
      DELETE FROM chart_of_accounts
      WHERE code IN ('5201','5202','5203','5204','5205','5206','5207','5208','5209','5210','5211');
    `);

    // ── 2) INSERT 7 baris Grup (parent NULL) ──
    await queryRunner.query(`
    INSERT INTO chart_of_accounts
      (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
    VALUES
      ('01.000.00000', 'ASET', 'ASSET', NULL, false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('02.000.00000', 'LIABILITAS', 'LIABILITY', NULL, false, true, 'CREDIT', 'CURRENT_LIABILITY', false, false),
      ('03.000.00000', 'EKUITAS', 'EQUITY', NULL, false, true, 'CREDIT', 'EQUITY', false, false),
      ('04.000.00000', 'PENDAPATAN', 'INCOME', NULL, false, true, 'CREDIT', 'REVENUE', false, false),
      ('05.000.00000', 'HARGA POKOK PENJUALAN', 'EXPENSE', NULL, false, true, 'DEBIT', 'COGS', false, false),
      ('06.000.00000', 'BEBAN OPERASIONAL', 'EXPENSE', NULL, false, true, 'DEBIT', 'SELLING_EXPENSE', false, false),
      ('07.000.00000', 'PENDAPATAN DAN BEBAN LAIN-LAIN', 'INCOME', NULL, false, true, 'CREDIT', 'OTHER_INCOME', false, false);
    `);

    // ── 3) INSERT 19 baris Kategori (parent_id via subquery ke kode Grup) ──
    await queryRunner.query(`
    INSERT INTO chart_of_accounts
      (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
    VALUES
      ('01.110.00000', 'Kas dan Setara Kas', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('01.120.00000', 'Piutang', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('01.130.00000', 'Persediaan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('01.140.00000', 'Uang Muka dan Biaya Dibayar di Muka', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('01.150.00000', 'Pajak Dibayar di Muka', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', false, false),
      ('01.210.00000', 'Aset Tetap Usaha — Harga Perolehan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'FIXED_ASSET', false, false),
      ('01.220.00000', 'Aset Tetap Usaha — Akumulasi Penyusutan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'CREDIT', 'ACCUMULATED_DEPRECIATION', false, false),
      ('01.310.00000', 'Aset Non-Usaha', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.000.00000'), false, true, 'DEBIT', 'NON_OPERATING_ASSET', false, false),
      ('02.110.00000', 'Liabilitas Jangka Pendek', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.000.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', false, false),
      ('02.210.00000', 'Liabilitas Jangka Panjang', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.000.00000'), false, true, 'CREDIT', 'LONG_TERM_LIABILITY', false, false),
      ('02.310.00000', 'Liabilitas Non-Usaha', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.000.00000'), false, true, 'CREDIT', 'NON_OPERATING_LIABILITY', false, false),
      ('03.110.00000', 'Modal', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.000.00000'), false, true, 'CREDIT', 'EQUITY', false, false),
      ('03.120.00000', 'Saldo Laba', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.000.00000'), false, true, 'CREDIT', 'EQUITY', false, false),
      ('04.110.00000', 'Pendapatan Penjualan', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '04.000.00000'), false, true, 'CREDIT', 'REVENUE', false, false),
      ('05.110.00000', 'Harga Pokok Penjualan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '05.000.00000'), false, true, 'DEBIT', 'COGS', false, false),
      ('06.110.00000', 'Beban Penjualan dan Distribusi', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.000.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', false, false),
      ('06.120.00000', 'Beban Umum dan Administrasi', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.000.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', false, false),
      ('07.110.00000', 'Pendapatan Lain-lain', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '07.000.00000'), false, true, 'CREDIT', 'OTHER_INCOME', false, false),
      ('07.210.00000', 'Beban Lain-lain', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '07.000.00000'), false, true, 'DEBIT', 'OTHER_EXPENSE', false, false);
    `);

    // ── 3b) Isi parent_id 13 akun lama — baris Kategori-nya BELUM ADA saat
    // langkah 1) berjalan (id-nya baru lahir barusan), jadi tidak bisa
    // diisi bersamaan dengan UPDATE code/name di atas. Tanpa langkah ini
    // ketiga belas akun lama jadi anak yatim (parent_id tetap NULL dari
    // seed asli) dan pohon COA di FE patah persis di titik mereka.
    await queryRunner.query(`
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '01.120.00000') WHERE code = '01.120.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '01.130.00000') WHERE code = '01.130.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '01.150.00000') WHERE code = '01.150.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000') WHERE code = '02.110.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000') WHERE code = '02.110.00022';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '03.110.00000') WHERE code = '03.110.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '04.110.00000') WHERE code = '04.110.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '04.110.00000') WHERE code = '04.110.00002';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '04.110.00000') WHERE code = '04.110.00003';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '05.110.00000') WHERE code = '05.110.00001';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000') WHERE code = '06.120.00099';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '07.110.00000') WHERE code = '07.110.00004';
      UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '07.210.00000') WHERE code = '07.210.00004';
    `);

    // ── 4) INSERT 69 baris Jenis baru (13 lama sudah ditangani lewat UPDATE di atas) ──
    // Kas Kecil/Toko/Besar + 4 bank DI-SEED di sini (menyimpang dari
    // CLAUDE.md §3 "tidak di-seed" — lihat §7.3 COA_USULAN.md, diperbarui
    // di commit yang sama). Kas Besar + seluruh bank -> requires_outflow_approval.
    // 03.120.00009 Ikhtisar Laba Rugi sengaja is_active=false (PR terbuka
    // closing bulanan, CLAUDE.md §2.15).
    await queryRunner.query(`
    INSERT INTO chart_of_accounts
      (code, name, account_type, parent_id, is_cash_account, is_active, normal_balance, account_subtype, is_postable, requires_outflow_approval)
    VALUES
      ('01.110.00001', 'Kas Kecil', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.110.00002', 'Kas Toko', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.110.00003', 'Kas Besar', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, true),
      ('01.110.00011', 'Bank BCA', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, true),
      ('01.110.00012', 'Bank BSI', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, true),
      ('01.110.00013', 'Bank Mandiri', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, true),
      ('01.110.00014', 'Bank BSI (a.n. Asmiati)', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.110.00000'), true, true, 'DEBIT', 'CURRENT_ASSET', true, true),
      ('01.120.00002', 'Piutang Karyawan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.120.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.120.00003', 'Piutang Pihak Berelasi', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.120.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.120.00009', 'Piutang Lain-lain', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.120.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.140.00001', 'Uang Muka Pembelian', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.140.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.140.00002', 'Biaya Dibayar di Muka', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.140.00000'), false, true, 'DEBIT', 'CURRENT_ASSET', true, false),
      ('01.210.00001', 'Tanah', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.210.00000'), false, true, 'DEBIT', 'FIXED_ASSET', true, false),
      ('01.210.00002', 'Bangunan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.210.00000'), false, true, 'DEBIT', 'FIXED_ASSET', true, false),
      ('01.210.00003', 'Kendaraan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.210.00000'), false, true, 'DEBIT', 'FIXED_ASSET', true, false),
      ('01.210.00004', 'Peralatan dan Inventaris Kantor', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.210.00000'), false, true, 'DEBIT', 'FIXED_ASSET', true, false),
      ('01.210.00005', 'Peralatan Gudang', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.210.00000'), false, true, 'DEBIT', 'FIXED_ASSET', true, false),
      ('01.220.00002', 'Akumulasi Penyusutan Bangunan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.220.00000'), false, true, 'CREDIT', 'ACCUMULATED_DEPRECIATION', true, false),
      ('01.220.00003', 'Akumulasi Penyusutan Kendaraan', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.220.00000'), false, true, 'CREDIT', 'ACCUMULATED_DEPRECIATION', true, false),
      ('01.220.00004', 'Akumulasi Penyusutan Peralatan dan Inventaris Kantor', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.220.00000'), false, true, 'CREDIT', 'ACCUMULATED_DEPRECIATION', true, false),
      ('01.220.00005', 'Akumulasi Penyusutan Peralatan Gudang', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.220.00000'), false, true, 'CREDIT', 'ACCUMULATED_DEPRECIATION', true, false),
      ('01.310.00001', 'Rumah Tinggal Pemilik', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.310.00000'), false, true, 'DEBIT', 'NON_OPERATING_ASSET', true, false),
      ('01.310.00002', 'Properti Lain Milik Pemilik', 'ASSET', (SELECT id FROM chart_of_accounts WHERE code = '01.310.00000'), false, true, 'DEBIT', 'NON_OPERATING_ASSET', true, false),
      ('02.110.00002', 'Hutang Biaya', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.110.00003', 'Hutang Gaji', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.110.00004', 'Uang Muka Penjualan', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.110.00011', 'Hutang Bank — Bagian Lancar', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.110.00012', 'Hutang Kartu Kredit', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.110.00021', 'Hutang Pajak', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.110.00000'), false, true, 'CREDIT', 'CURRENT_LIABILITY', true, false),
      ('02.210.00001', 'Hutang Bank Jangka Panjang', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.210.00000'), false, true, 'CREDIT', 'LONG_TERM_LIABILITY', true, false),
      ('02.210.00002', 'Hutang Pihak Berelasi', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.210.00000'), false, true, 'CREDIT', 'LONG_TERM_LIABILITY', true, false),
      ('02.310.00001', 'Hutang Bank — Pembiayaan Rumah (BSI)', 'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '02.310.00000'), false, true, 'CREDIT', 'NON_OPERATING_LIABILITY', true, false),
      ('03.110.00002', 'Prive (Pengambilan Pemilik)', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.110.00000'), false, true, 'DEBIT', 'CONTRA_EQUITY', true, false),
      ('03.120.00001', 'Laba Ditahan', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.120.00000'), false, true, 'CREDIT', 'EQUITY', true, false),
      ('03.120.00002', 'Laba (Rugi) Tahun Berjalan', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.120.00000'), false, true, 'CREDIT', 'EQUITY', true, false),
      ('03.120.00009', 'Ikhtisar Laba Rugi', 'EQUITY', (SELECT id FROM chart_of_accounts WHERE code = '03.120.00000'), false, false, 'CREDIT', 'EQUITY', true, false),
      ('05.110.00002', 'Selisih Persediaan (Stok Opname)', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '05.110.00000'), false, true, 'DEBIT', 'COGS', true, false),
      ('05.110.00003', 'Kerugian Barang Rusak dan Pemusnahan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '05.110.00000'), false, true, 'DEBIT', 'COGS', true, false),
      ('06.110.00001', 'B. Gaji Salesman', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00002', 'B. Upah Tukang Angkut', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00003', 'B. Bongkar Muat di Toko Pelanggan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00004', 'B. Angkut Luar Kota', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00005', 'B. Parkir dan Retribusi', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00006', 'B. BBM Kendaraan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00007', 'B. Servis dan Suku Cadang Kendaraan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00008', 'B. Pajak dan Perizinan Kendaraan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00009', 'B. Perlengkapan Penjualan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.110.00099', 'B. Penjualan Lainnya', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.110.00000'), false, true, 'DEBIT', 'SELLING_EXPENSE', true, false),
      ('06.120.00001', 'B. Gaji dan Upah Staf', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00002', 'B. Tunjangan Hari Raya dan Bonus', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00003', 'B. Listrik', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00004', 'B. Air (PDAM)', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00005', 'B. Telepon, Internet, dan Pulsa', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00006', 'B. Alat Tulis Kantor', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00007', 'B. Konsumsi Kantor', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00008', 'B. Keamanan dan Kebersihan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00009', 'B. Perbaikan dan Pemeliharaan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00010', 'B. Sewa', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00011', 'B. Jasa Profesional', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00012', 'B. Pajak dan Perizinan Usaha', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00013', 'B. Sumbangan dan Kemasyarakatan', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('06.120.00014', 'B. Penyusutan Aset Tetap', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '06.120.00000'), false, true, 'DEBIT', 'ADMIN_EXPENSE', true, false),
      ('07.110.00001', 'Pendapatan Jasa Lain', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '07.110.00000'), false, true, 'CREDIT', 'OTHER_INCOME', true, false),
      ('07.110.00002', 'Pendapatan Bunga dan Jasa Giro', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '07.110.00000'), false, true, 'CREDIT', 'OTHER_INCOME', true, false),
      ('07.110.00003', 'Laba (Rugi) Pelepasan Aset Tetap', 'INCOME', (SELECT id FROM chart_of_accounts WHERE code = '07.110.00000'), false, true, 'CREDIT', 'OTHER_INCOME', true, false),
      ('07.210.00001', 'B. Bunga Pinjaman', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '07.210.00000'), false, true, 'DEBIT', 'OTHER_EXPENSE', true, false),
      ('07.210.00002', 'B. Administrasi Bank', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '07.210.00000'), false, true, 'DEBIT', 'OTHER_EXPENSE', true, false),
      ('07.210.00003', 'B. Provisi dan Biaya Pinjaman', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '07.210.00000'), false, true, 'DEBIT', 'OTHER_EXPENSE', true, false),
      ('07.210.00099', 'B. Lain-lain', 'EXPENSE', (SELECT id FROM chart_of_accounts WHERE code = '07.210.00000'), false, true, 'DEBIT', 'OTHER_EXPENSE', true, false);
    `);

    // ── 5) Sekarang 108 baris semuanya terisi — pasang NOT NULL ──
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        ALTER COLUMN normal_balance SET NOT NULL,
        ALTER COLUMN account_subtype SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lepas dulu parent_id 13 akun lama (langkah 3b di up()) — mereka
    // menunjuk ke baris Kategori yang justru akan dihapus di bawah. Tanpa
    // ini DELETE Kategori/Grup melanggar FK parent_id (REFERENCES tanpa ON
    // DELETE CASCADE).
    await queryRunner.query(`
      UPDATE chart_of_accounts SET parent_id = NULL WHERE code IN (
        '01.120.00001', '01.130.00001', '01.150.00001',
        '02.110.00001', '02.110.00022',
        '03.110.00001',
        '04.110.00001', '04.110.00002', '04.110.00003',
        '05.110.00001',
        '06.120.00099',
        '07.110.00004', '07.210.00004'
      );
    `);

    // Hapus dari anak ke induk (parent_id REFERENCES tanpa ON DELETE CASCADE).
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN (
        '01.110.00001', '01.110.00002', '01.110.00003', '01.110.00011', '01.110.00012', '01.110.00013', '01.110.00014',
        '01.120.00002', '01.120.00003', '01.120.00009',
        '01.140.00001', '01.140.00002',
        '01.210.00001', '01.210.00002', '01.210.00003', '01.210.00004', '01.210.00005',
        '01.220.00002', '01.220.00003', '01.220.00004', '01.220.00005',
        '01.310.00001', '01.310.00002',
        '02.110.00002', '02.110.00003', '02.110.00004', '02.110.00011', '02.110.00012', '02.110.00021',
        '02.210.00001', '02.210.00002',
        '02.310.00001',
        '03.110.00002', '03.120.00001', '03.120.00002', '03.120.00009',
        '05.110.00002', '05.110.00003',
        '06.110.00001', '06.110.00002', '06.110.00003', '06.110.00004', '06.110.00005', '06.110.00006', '06.110.00007', '06.110.00008', '06.110.00009', '06.110.00099',
        '06.120.00001', '06.120.00002', '06.120.00003', '06.120.00004', '06.120.00005', '06.120.00006', '06.120.00007', '06.120.00008', '06.120.00009', '06.120.00010', '06.120.00011', '06.120.00012', '06.120.00013', '06.120.00014',
        '07.110.00001', '07.110.00002', '07.110.00003',
        '07.210.00001', '07.210.00002', '07.210.00003', '07.210.00099'
      );
    `);
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN (
        '01.110.00000', '01.120.00000', '01.130.00000', '01.140.00000', '01.150.00000', '01.210.00000', '01.220.00000', '01.310.00000',
        '02.110.00000', '02.210.00000', '02.310.00000',
        '03.110.00000', '03.120.00000',
        '04.110.00000',
        '05.110.00000',
        '06.110.00000', '06.120.00000',
        '07.110.00000', '07.210.00000'
      );
    `);
    await queryRunner.query(`
      DELETE FROM chart_of_accounts WHERE code IN (
        '01.000.00000', '02.000.00000', '03.000.00000', '04.000.00000', '05.000.00000', '06.000.00000', '07.000.00000'
      );
    `);

    // Kembalikan 13 kode lama.
    await queryRunner.query(`
    UPDATE chart_of_accounts SET code = '1102', name = 'Piutang Usaha', account_type = 'ASSET' WHERE code = '01.120.00001';
    UPDATE chart_of_accounts SET code = '1101', name = 'Persediaan', account_type = 'ASSET' WHERE code = '01.130.00001';
    UPDATE chart_of_accounts SET code = '1103', name = 'PPN Masukan', account_type = 'ASSET' WHERE code = '01.150.00001';
    UPDATE chart_of_accounts SET code = '2101', name = 'Hutang Usaha', account_type = 'LIABILITY' WHERE code = '02.110.00001';
    UPDATE chart_of_accounts SET code = '2102', name = 'PPN Keluaran', account_type = 'LIABILITY' WHERE code = '02.110.00022';
    UPDATE chart_of_accounts SET code = '3101', name = 'Modal', account_type = 'EQUITY' WHERE code = '03.110.00001';
    UPDATE chart_of_accounts SET code = '4101', name = 'Pendapatan Penjualan', account_type = 'INCOME' WHERE code = '04.110.00001';
    UPDATE chart_of_accounts SET code = '4103', name = 'Retur Penjualan', account_type = 'INCOME' WHERE code = '04.110.00002';
    UPDATE chart_of_accounts SET code = '4104', name = 'Diskon Penjualan', account_type = 'INCOME' WHERE code = '04.110.00003';
    UPDATE chart_of_accounts SET code = '5101', name = 'HPP', account_type = 'EXPENSE' WHERE code = '05.110.00001';
    UPDATE chart_of_accounts SET code = '5102', name = 'Biaya Operasional', account_type = 'EXPENSE' WHERE code = '06.120.00099';
    UPDATE chart_of_accounts SET code = '5104', name = 'Selisih Retur Pembelian', account_type = 'EXPENSE' WHERE code = '07.110.00004';
    UPDATE chart_of_accounts SET code = '5103', name = 'Selisih Pembayaran', account_type = 'EXPENSE' WHERE code = '07.210.00004';
    `);

    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        DROP COLUMN normal_balance,
        DROP COLUMN account_subtype,
        DROP COLUMN is_postable,
        DROP COLUMN is_opening_balance_equity_account;
    `);
    await queryRunner.query(`DROP TYPE normal_balance;`);
    await queryRunner.query(`DROP TYPE account_subtype;`);

    // Kembalikan 11 akun placeholder 52xx persis seperti seed
    // 1785080602947 semula (ids baru — tidak ada yang pernah menunjuk ke
    // id lama karena baris ini tidak pernah dipakai jurnal, lihat komentar
    // di up()).
    await queryRunner.query(`
      INSERT INTO chart_of_accounts (code, name, account_type, is_cash_account) VALUES
      ('5201', 'Gaji Harian Tukang Angkut', 'EXPENSE', false),
      ('5202', 'Ongkos Kirim Pembelian', 'EXPENSE', false),
      ('5203', 'BBM & Transportasi', 'EXPENSE', false),
      ('5204', 'Parkir & Retribusi', 'EXPENSE', false),
      ('5205', 'Angkut/Bongkar Muat', 'EXPENSE', false),
      ('5206', 'Listrik & Air', 'EXPENSE', false),
      ('5207', 'Telepon & Internet', 'EXPENSE', false),
      ('5208', 'Sewa', 'EXPENSE', false),
      ('5209', 'Perlengkapan Kantor', 'EXPENSE', false),
      ('5210', 'Perbaikan & Pemeliharaan', 'EXPENSE', false),
      ('5211', 'Biaya Operasional Lain-lain', 'EXPENSE', false);
    `);
  }
}
