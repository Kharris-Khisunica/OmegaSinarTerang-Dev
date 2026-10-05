import { MigrationInterface, QueryRunner } from 'typeorm';

// Auto-capitalize (asumsi A2, docs/RENCANA_REVISI_TESTING_KLIEN.md §2B) —
// backfill data lama supaya seragam dengan data baru yang sudah dinormalisasi
// di lapisan service (lihat src/common/normalize-text.ts, dipanggil dari
// create()/update() brands/units/salesmen/agents/vehicles/warehouses/
// customers/suppliers/products).
//
// Field yang di-uppercase: name (brands, units, salesmen, agents, vehicles,
// warehouses, customers, suppliers), alamat 4 kolom (customers), contact_address
// (suppliers), dan display_name (products — gabungan yang terindeks & dipakai
// pencarian operator, CLAUDE.md §3). TIDAK disentuh: email, code/display_code,
// npwp, nomor telepon, keterangan/kemasan/ukuran_uom (komponen bebas produk),
// products.code (barcode angka).
//
// products.display_name DIGABUNG ULANG di sini juga (bukan cuma di-uppercase)
// karena paket R2 (docs/RENCANA_REVISI_TESTING_KLIEN.md §3, asumsi A5) mengubah
// urutan penggabungan di ProductsService.buildDisplayName() dari
// Merek·Keterangan·Kemasan·UkuranUom menjadi Merek·Kemasan·Keterangan·UkuranUom.
// Menggabung ulang dari kolom sumber (bukan menerapkan UPPER/TRIM ke string
// lama) sekaligus membetulkan urutan produk yang sudah ada — SATU migration,
// SATU sentuhan ke kolom ini, bukan dua.
export class BackfillUppercaseNameFields1785080602965 implements MigrationInterface {
  name = 'BackfillUppercaseNameFields1785080602965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE brands SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`UPDATE units SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`UPDATE salesmen SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`UPDATE agents SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`UPDATE vehicles SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`UPDATE warehouses SET name = UPPER(TRIM(name));`);
    await queryRunner.query(`
      UPDATE customers SET
        name = UPPER(TRIM(name)),
        address = CASE WHEN address IS NULL THEN NULL ELSE UPPER(TRIM(address)) END,
        district = CASE WHEN district IS NULL THEN NULL ELSE UPPER(TRIM(district)) END,
        city = CASE WHEN city IS NULL THEN NULL ELSE UPPER(TRIM(city)) END,
        province = CASE WHEN province IS NULL THEN NULL ELSE UPPER(TRIM(province)) END;
    `);
    await queryRunner.query(`
      UPDATE suppliers SET
        name = UPPER(TRIM(name)),
        contact_address = CASE WHEN contact_address IS NULL THEN NULL ELSE UPPER(TRIM(contact_address)) END;
    `);
    // Digabung ulang dari kolom sumber dengan urutan baru (Merek·Kemasan·
    // Keterangan·UkuranUom), bukan sekadar UPPER(TRIM(display_name)) —
    // lihat catatan di atas kelas ini. CONCAT_WS melewati NULL secara
    // otomatis; NULLIF(TRIM(x), '') mengubah string kosong jadi NULL supaya
    // ikut dilewati juga, meniru filter falsy/kosong di buildDisplayName().
    await queryRunner.query(`
      UPDATE products p SET display_name = UPPER(TRIM(CONCAT_WS(' ',
        b.name,
        NULLIF(TRIM(p.kemasan), ''),
        NULLIF(TRIM(p.keterangan), ''),
        NULLIF(TRIM(p.ukuran_uom), '')
      )))
      FROM brands b
      WHERE b.id = p.brand_id;
    `);
  }

  // down() SENGAJA no-op: huruf asli sebelum di-uppercase tidak disimpan di
  // mana pun, jadi tidak ada cara memulihkannya. Menjalankan down() lalu up()
  // lagi tetap aman (idempotent — UPPER(TRIM(x)) dua kali = sama), hanya saja
  // bentuk huruf campuran sebelum migration ini TIDAK bisa dikembalikan.
  public async down(): Promise<void> {
    // no-op yang disengaja — lihat komentar di atas kelas.
  }
}
