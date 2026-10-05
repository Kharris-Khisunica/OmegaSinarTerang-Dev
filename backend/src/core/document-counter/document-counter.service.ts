import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export type DocumentType =
  | 'SALES_INVOICE'
  | 'SALES_ORDER'
  | 'PURCHASE_INVOICE'
  | 'WAREHOUSE_MUTATION'
  | 'DELIVERY_ORDER'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'PAYMENT'
  | 'JOURNAL_ENTRY'
  | 'OPERATIONAL_EXPENSE'
  | 'CASH_TRANSFER';

// Kode persis dari sistem lama klien (CLAUDE.md §2.3) — JL/B1/GD sudah
// tercetak di nota yang beredar. Jangan diganti jadi singkatan lama
// (mis. kode invoice/purchase/warehouse yang terasa lebih rapi) meski itu
// godaan wajar.
export const DOCUMENT_PREFIXES: Record<DocumentType, string> = {
  SALES_INVOICE: 'JL',
  SALES_ORDER: 'SO',
  PURCHASE_INVOICE: 'B1',
  WAREHOUSE_MUTATION: 'GD',
  DELIVERY_ORDER: 'SJ',
  SALES_RETURN: 'RJ',
  PURCHASE_RETURN: 'RB',
  PAYMENT: 'PAY',
  JOURNAL_ENTRY: 'JE',
  // KK = Kas Keluar (Hari 17, docs/PERTANYAAN_KLIEN_BIAYA_OPERASIONAL.md §8)
  // — usul dokumen klien, tidak ikut kunci cetak & Laporan Kontinuitas.
  OPERATIONAL_EXPENSE: 'KK',
  // PB = Pindah Buku Kas (paket R9, menyerap Hari 32A tugas 7) — pemindahan
  // antar kas milik sendiri, bukan kunci cetak §2.16 & tidak masuk Laporan
  // Kontinuitas Nomor Dokumen (pola sama OPERATIONAL_EXPENSE di atas).
  CASH_TRANSFER: 'PB',
};

@Injectable()
export class DocumentCounterService {
  /**
   * Format: KODE/{settings.store_code}-YYMMXXXX — kode toko WAJIB dibaca
   * dari settings, tidak boleh ada nilai contoh yang di-hardcode di sini.
   * `store_code` WAJIB dibaca dari `settings` tiap panggilan lewat
   * `manager` pemanggil (ikut transaction yang sama) — dilarang hardcode.
   */
  async getNextNumber(
    docType: DocumentType,
    date: Date,
    manager: EntityManager,
  ): Promise<string> {
    const period = formatPeriod(date);
    const storeCode = await this.getStoreCode(manager);

    // ON CONFLICT DO NOTHING dulu supaya baris period baru sudah pasti ada
    // sebelum di-lock — SELECT ... FOR UPDATE terhadap baris yang belum ada
    // tidak mengunci apa pun, yang membuat dua transaction pertama di period
    // baru sama-sama INSERT dan bentrok unique constraint.
    await manager.query(
      `INSERT INTO document_counters (doc_type, period, last_number)
       VALUES ($1, $2, 0)
       ON CONFLICT (doc_type, period) DO NOTHING`,
      [docType, period],
    );

    const rows: { last_number: number }[] = await manager.query(
      `SELECT last_number FROM document_counters
       WHERE doc_type = $1 AND period = $2
       FOR UPDATE`,
      [docType, period],
    );

    const nextNumber = Number(rows[0].last_number) + 1;

    await manager.query(
      `UPDATE document_counters SET last_number = $1
       WHERE doc_type = $2 AND period = $3`,
      [nextNumber, docType, period],
    );

    const prefix = DOCUMENT_PREFIXES[docType];
    const sequence = String(nextNumber).padStart(4, '0');
    return `${prefix}/${storeCode}-${period}${sequence}`;
  }

  private async getStoreCode(manager: EntityManager): Promise<string> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'store_code'`,
    );
    if (!rows[0]?.value) {
      throw new Error(
        'settings.store_code belum di-set — tidak bisa membuat nomor dokumen.',
      );
    }
    return rows[0].value;
  }
}

function formatPeriod(date: Date): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}
