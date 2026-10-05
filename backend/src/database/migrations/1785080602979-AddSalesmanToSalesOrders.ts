import { MigrationInterface, QueryRunner } from 'typeorm';

// Koreksi pemahaman (02 Okt 2026): Sales Order butuh salesman yang menjadi
// PJ (penanggung jawab) atas order itu — dasar praktik segregasi tugas yang
// klien jalankan di lapangan: orang yang menulis/menjadi PJ sebuah SO harus
// BEDA dari orang yang melakukan pengecekan barang saat diangkut. Sistem ini
// tidak membangun pengecekan itu (belum ada konsep "checker" di modul mana
// pun) — yang ditambahkan di sini murni pondasinya: SO sekarang MENYIMPAN
// siapa salesman PJ-nya, supaya informasi itu bisa diteruskan ke Faktur
// Penjualan saat "Jadikan Faktur" (SalesInvoicesService, lihat
// resolveSalesman()) — sebelumnya sales_orders TIDAK menyimpan salesman sama
// sekali (lihat komentar lama yang dicabut di
// penjualan/faktur/index.vue#prefillFromSalesOrder).
//
// NOT NULL langsung (bukan nullable lalu di-backfill nanti) — dev DB per
// 02 Okt 2026 hanya punya 4 baris sales_orders (seluruhnya data uji, 0 baris
// produksi sungguhan, cut-over belum terjadi). Baris CONVERTED dibackfill
// dari salesman faktur yang sudah menyerapnya (membuat data lama konsisten
// dengan invarian baru "invoice.salesman_id ikut SO" alih-alih nilai
// sembarangan); baris OPEN dibackfill ke salesman aktif mana pun — keduanya
// murni kebersihan data uji, BUKAN keputusan yang mengubah transaksi
// sungguhan.
export class AddSalesmanToSalesOrders1785080602979 implements MigrationInterface {
  name = 'AddSalesmanToSalesOrders1785080602979';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sales_orders ADD COLUMN salesman_id UUID;
    `);

    await queryRunner.query(`
      UPDATE sales_orders so
      SET salesman_id = si.salesman_id
      FROM sales_invoices si
      WHERE si.sales_order_id = so.id AND so.salesman_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE sales_orders
      SET salesman_id = (SELECT id FROM salesmen WHERE is_active = true ORDER BY code LIMIT 1)
      WHERE salesman_id IS NULL;
    `);

    const orphans = (await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM sales_orders WHERE salesman_id IS NULL`,
    )) as { count: string }[];
    if (Number(orphans[0].count) > 0) {
      throw new Error(
        'Ada baris sales_orders yang tidak bisa dibackfill salesman_id-nya ' +
          '(kemungkinan tabel salesmen kosong) — isi master salesman dulu ' +
          'sebelum menjalankan migrasi ini.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE sales_orders ALTER COLUMN salesman_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE sales_orders
      ADD CONSTRAINT sales_orders_salesman_id_fkey
      FOREIGN KEY (salesman_id) REFERENCES salesmen(id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_sales_orders_salesman ON sales_orders (salesman_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_sales_orders_salesman;`);
    await queryRunner.query(
      `ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_salesman_id_fkey;`,
    );
    await queryRunner.query(
      `ALTER TABLE sales_orders DROP COLUMN salesman_id;`,
    );
  }
}
