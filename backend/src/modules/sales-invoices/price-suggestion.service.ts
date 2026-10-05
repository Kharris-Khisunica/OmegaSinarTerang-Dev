import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface PriceSuggestionRow {
  date: string;
  qty: number;
  unitName: string;
  unitPrice: number;
}

export type PriceSuggestionSource =
  'CUSTOMER_PRODUCT_UNIT' | 'PRODUCT_UNIT' | 'NONE';

export interface PriceSuggestionResult {
  source: PriceSuggestionSource;
  suggestions: PriceSuggestionRow[];
}

interface RawPriceSuggestionRow {
  date: string;
  qty: string;
  unitName: string;
  unitPrice: string;
}

// GET /price-suggestion — jalur terpanas aplikasi (CLAUDE.md §3 "Riwayat
// harga"), dipanggil tiap kali operator mengetik baris faktur penjualan.
// Raw SQL via DataSource, bukan QueryBuilder/repository — pola sama
// ProductsService.getCommittedQty() (agregat baca-saja lintas tabel, target
// <300ms, tidak di-cache; kalau meleset cek index dulu, bukan tambah cache).
@Injectable()
export class PriceSuggestionService {
  constructor(private readonly dataSource: DataSource) {}

  async getSuggestions(
    customerId: string,
    productId: string,
    unitId: string,
  ): Promise<PriceSuggestionResult> {
    const tier1 = await this.queryByCustomerProductUnit(
      customerId,
      productId,
      unitId,
    );
    if (tier1.length > 0) {
      return { source: 'CUSTOMER_PRODUCT_UNIT', suggestions: tier1 };
    }

    const tier2 = await this.queryByProductUnit(productId, unitId);
    if (tier2.length > 0) {
      return { source: 'PRODUCT_UNIT', suggestions: tier2 };
    }

    // Tidak ada tier 3 (harga master) — keputusan final klien 20 Agustus 2026
    // (KONTEKS_REVISI_2026-07-28.md §4.2 PR #3, tertutup): kalau tier 1 & 2
    // kosong, panel tampil kosong dan operator bertanya ke Master langsung,
    // bukan menampilkan harga master yang klien sendiri bilang "tidak
    // dipakai di lapangan". Bukan sekadar belum dibangun — sengaja tidak
    // akan pernah dibangun.
    return { source: 'NONE', suggestions: [] };
  }

  // Tier 1 — pelanggan + produk + satuan persis. Query yang harus dibuktikan
  // memakai idx_sales_invoice_lines_price_lookup lewat EXPLAIN ANALYZE.
  //
  // ORDER BY sil.created_at DESC — BUKAN sil.id DESC. Temuan saat implementasi:
  // id di-generate lewat gen_random_uuid() (UUID v4, ACAK), jadi "id DESC"
  // TIDAK berkorelasi dengan waktu sama sekali — memakainya sebagai urutan
  // "10 transaksi terakhir" akan mengembalikan baris ACAK, bukan yang
  // terbaru, tanpa error apa pun (persis jenis bug yang CLAUDE.md peringatkan
  // berulang kali). Index komposit tetap dipertahankan persis sesuai
  // spesifikasi tugas (customer_id, product_id, unit_id, id DESC) — ia tetap
  // sepenuhnya melayani predikat WHERE (dibuktikan EXPLAIN), hanya tidak lagi
  // menghilangkan node Sort untuk ORDER BY. Aman: hasil sudah difilter ke
  // segelintir baris per kombinasi sebelum di-sort.
  private async queryByCustomerProductUnit(
    customerId: string,
    productId: string,
    unitId: string,
  ): Promise<PriceSuggestionRow[]> {
    const rows: RawPriceSuggestionRow[] = await this.dataSource.query(
      `SELECT si.invoice_date AS date, sil.qty_input AS qty,
              u.name AS "unitName", sil.unit_price AS "unitPrice"
       FROM sales_invoice_lines sil
       JOIN sales_invoices si ON si.id = sil.sales_invoice_id
       JOIN units u ON u.id = sil.unit_id
       WHERE sil.customer_id = $1
         AND sil.product_id = $2
         AND sil.unit_id = $3
         AND si.posting_status = 'POSTED'
       ORDER BY sil.created_at DESC
       LIMIT 10`,
      [customerId, productId, unitId],
    );
    return this.mapRows(rows);
  }

  // Tier 2 — produk + satuan, ke pelanggan mana pun. Tanpa predikat
  // customer_id, index komposit tidak dipakai (customer_id kolom pertama),
  // tapi idx_sales_invoice_lines_product menopang WHERE product_id-nya —
  // cukup di volume ±330 faktur/bulan.
  private async queryByProductUnit(
    productId: string,
    unitId: string,
  ): Promise<PriceSuggestionRow[]> {
    const rows: RawPriceSuggestionRow[] = await this.dataSource.query(
      `SELECT si.invoice_date AS date, sil.qty_input AS qty,
              u.name AS "unitName", sil.unit_price AS "unitPrice"
       FROM sales_invoice_lines sil
       JOIN sales_invoices si ON si.id = sil.sales_invoice_id
       JOIN units u ON u.id = sil.unit_id
       WHERE sil.product_id = $1
         AND sil.unit_id = $2
         AND si.posting_status = 'POSTED'
       ORDER BY sil.created_at DESC
       LIMIT 10`,
      [productId, unitId],
    );
    return this.mapRows(rows);
  }

  private mapRows(rows: RawPriceSuggestionRow[]): PriceSuggestionRow[] {
    return rows.map((row) => ({
      date: row.date,
      qty: Number(row.qty),
      unitName: row.unitName,
      unitPrice: Number(row.unitPrice),
    }));
  }
}
