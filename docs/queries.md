# Query Manual — Pengganti Laporan yang Dipotong

> Dibuat Hari 32 (CLAUDE.md §7 DoD, `PROGRESS.md` §6 "Daftar Potong Darurat").
> **Laporan Retur** dan **Laporan Produk Stok Minus** dipotong dari scope MVP —
> "sementara pakai query manual" **berarti menjalankan query di file ini**,
> bukan mengarang SQL baru tiap kali dibutuhkan. Kalau kebutuhannya berubah
> (kolom tambahan, filter baru), **edit query di sini**, jangan simpan versi
> pribadi di tempat lain.

**Cara pakai** (PC operator, Postgres native — CLAUDE.md §1 "Deploy"):

```bash
psql -h localhost -p 5432 -U postgres -d omega_dev -f docs/queries.md
```

atau salin satu blok SQL ke `psql -d omega_dev` / pgAdmin / DBeaver langsung.
Kedua query di bawah sudah diuji jalan terhadap `omega_dev` (04 Sep 2026).

---

## 1. Stok Minus

Semua kombinasi produk+gudang dengan saldo negatif. Stok minus **diizinkan**,
bukan bug (CLAUDE.md §2.8 — "Stok minus diizinkan, bukan ditolak") — query ini
untuk **memantau**, bukan untuk mendeteksi kesalahan.

```sql
SELECT p.code,
       p.display_name,
       w.name AS warehouse_name,
       w.warehouse_type,
       b.qty_base_unit AS saldo_minus
FROM product_stock_balance b
JOIN products p ON p.id = b.product_id
JOIN warehouses w ON w.id = b.warehouse_id
WHERE b.qty_base_unit < 0
ORDER BY b.qty_base_unit ASC;
```

Kalau butuh angka dalam satuan pecahan ("12 DUS 15 RENCENG") bukan base unit
mentah, itu tanggung jawab `computeQtyBreakdown()`
(`backend/src/core/stock-recorder/qty-breakdown.ts`) — query manual ini sengaja
tidak mencoba meniru konversinya di SQL murni.

---

## 2. Retur (Penjualan `RJ` + Pembelian `RB`)

Gabungan dua tabel yang skemanya berbeda (Retur Penjualan menunjuk faktur asal,
Retur Pembelian menunjuk supplier — CLAUDE.md §3 "Lain-lain"/"Bad stock") jadi
satu daftar kronologis. Kolom enum di-cast `::text` — Postgres menolak `UNION`
langsung antar dua tipe enum berbeda (`sales_return_posting_status` vs
`purchase_return_posting_status`) meski nilainya sama-sama `POSTED`/`VOIDED`.

```sql
SELECT 'RJ' AS jenis,
       sr.return_number AS nomor,
       sr.return_date AS tanggal,
       c.name AS pihak,
       sr.total_amount AS nilai,
       sr.posting_status::text AS status
FROM sales_returns sr
JOIN customers c ON c.id = sr.customer_id
UNION ALL
SELECT 'RB' AS jenis,
       pr.return_number AS nomor,
       pr.return_date AS tanggal,
       s.name AS pihak,
       pr.subtotal_agreed_amount AS nilai,
       pr.posting_status::text AS status
FROM purchase_returns pr
JOIN suppliers s ON s.id = pr.supplier_id
ORDER BY tanggal DESC, nomor;
```

Catatan:

- `nilai` untuk RJ = `total_amount` (DPP + PPN Keluaran, sudah termasuk pajak).
  Untuk RB = `subtotal_agreed_amount` (nilai negosiasi dengan supplier, CLAUDE.md
  §4 "Retur Pembelian") — **dua kolom ini TIDAK sepadan langsung**, jangan
  dijumlahkan lintas jenis tanpa memahami bedanya.
- Retur yang `VOIDED` tetap muncul (tidak ada hard-delete, CLAUDE.md §2.1) —
  filter `WHERE sr.posting_status = 'POSTED'` / `pr.posting_status = 'POSTED'`
  di masing-masing sisi `UNION` kalau hanya butuh yang aktif.
- Detail per baris (produk, qty, harga pokok) ada di `sales_return_lines` /
  `purchase_return_lines` — tidak disertakan di sini supaya query tetap
  ringkas untuk kebutuhan "daftar retur bulan ini", bukan rekonsiliasi detail.
