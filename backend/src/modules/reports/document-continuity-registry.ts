import { DocumentType } from '../../core/document-counter/document-counter.service';

export interface DocumentContinuityConfig {
  table: string;
  numberColumn: string;
  dateColumn: string;
  /** Ekspresi SQL (alias `t`) — literal untuk tipe tanpa kolom status (JE). */
  statusExpression: string;
  /** Ekspresi SQL (alias `t`) — boleh NULL::text kalau dokumen tidak punya satu pihak tunggal. */
  partyExpression: string;
  /** Ekspresi SQL (alias `t`) — boleh NULL::numeric kalau dokumen tidak menyentuh uang. */
  amountExpression: string;
  label: string;
}

/**
 * Laporan Kontinuitas Nomor Dokumen (CLAUDE.md §2.4, Hari 28) — berlaku
 * untuk semua jenis dokumen yang penomorannya lewat DocumentCounterService,
 * KECUALI:
 *   - SALES_ORDER — keputusan 29 Juli: SO tidak ikut kunci cetak (§2.16)
 *     dan tidak masuk laporan ini (§3 "Sales Order tidak menahan stok").
 *   - OPERATIONAL_EXPENSE (KK) — usul dokumen klien, bukan dari sistem
 *     lama, sengaja tidak ikut kunci cetak maupun laporan ini (lihat
 *     komentar DOCUMENT_PREFIXES di document-counter.service.ts).
 *   - CASH_TRANSFER (PB, paket R9) — pemindahan antar kas milik sendiri,
 *     pola sama OPERATIONAL_EXPENSE (lihat komentar DOCUMENT_PREFIXES).
 *   - KASBON_REPAYMENT (PK, need_fixing.md #26) — pelunasan kasbon karyawan,
 *     pola sama OPERATIONAL_EXPENSE/CASH_TRANSFER.
 *   - STOCK_OPNAME (OP, need_fixing.md #25) — dokumen internal opname.
 *
 * Nama tabel/kolom di sini TIDAK PERNAH datang dari input user — hanya
 * dipakai lewat DOCUMENT_CONTINUITY_TYPES yang statis, lalu diinterpolasi ke
 * raw SQL di document-continuity.service.ts (pola sama PRINT_LOCK_TABLES /
 * print-lock.service.ts). Nilai dari user (type/year/month) selalu lewat
 * parameter query ($1, $2, dst), tidak pernah diinterpolasi langsung.
 */
export const DOCUMENT_CONTINUITY_TYPES: Partial<
  Record<DocumentType, DocumentContinuityConfig>
> = {
  SALES_INVOICE: {
    table: 'sales_invoices',
    numberColumn: 'invoice_number',
    dateColumn: 'invoice_date',
    statusExpression: 't.posting_status',
    partyExpression:
      '(SELECT c.name FROM customers c WHERE c.id = t.customer_id)',
    amountExpression: 't.total_amount',
    label: 'Faktur Penjualan (JL)',
  },
  PURCHASE_INVOICE: {
    table: 'purchase_invoices',
    numberColumn: 'invoice_number',
    // receipt_date — ini yang dipakai PurchaseInvoicesService.create() saat
    // memanggil getNextNumber() (CLAUDE.md §3 "Pembelian"), jadi ini juga
    // tanggal yang menentukan `period` nomor dokumennya. BUKAN
    // supplier_invoice_date (dasar jatuh tempo, bisa beda periode).
    dateColumn: 'receipt_date',
    statusExpression: 't.posting_status',
    partyExpression:
      '(SELECT s.name FROM suppliers s WHERE s.id = t.supplier_id)',
    amountExpression: 't.total_amount',
    label: 'Faktur Pembelian (B1)',
  },
  WAREHOUSE_MUTATION: {
    table: 'warehouse_mutations',
    numberColumn: 'mutation_number',
    dateColumn: 'mutation_date',
    statusExpression: 't.posting_status',
    partyExpression:
      "(SELECT w1.name FROM warehouses w1 WHERE w1.id = t.from_warehouse_id) || ' -> ' || (SELECT w2.name FROM warehouses w2 WHERE w2.id = t.to_warehouse_id)",
    // GD tidak menyentuh uang (CLAUDE.md §3 "Mutasi gudang": "Nota mutasi
    // hanya mencetak qty, tanpa nilai") — NULL dengan sengaja, bukan 0,
    // supaya tidak terbaca seolah bernilai Rp 0.
    amountExpression: 'NULL::numeric',
    label: 'Mutasi Gudang (GD)',
  },
  DELIVERY_ORDER: {
    table: 'delivery_orders',
    numberColumn: 'delivery_number',
    dateColumn: 'delivery_date',
    statusExpression: 't.posting_status',
    partyExpression:
      '(SELECT c.name FROM customers c WHERE c.id = t.customer_id)',
    // SJ tidak mengikat uang sendiri — nilainya ada di faktur penjualan
    // asal (sales_invoice_id). NULL dengan sengaja.
    amountExpression: 'NULL::numeric',
    label: 'Surat Jalan (SJ)',
  },
  SALES_RETURN: {
    table: 'sales_returns',
    numberColumn: 'return_number',
    dateColumn: 'return_date',
    statusExpression: 't.posting_status',
    partyExpression:
      '(SELECT c.name FROM customers c WHERE c.id = t.customer_id)',
    amountExpression: 't.total_amount',
    label: 'Retur Penjualan (RJ)',
  },
  PURCHASE_RETURN: {
    table: 'purchase_returns',
    numberColumn: 'return_number',
    dateColumn: 'return_date',
    statusExpression: 't.posting_status',
    partyExpression:
      '(SELECT s.name FROM suppliers s WHERE s.id = t.supplier_id)',
    amountExpression: 't.subtotal_agreed_amount',
    label: 'Retur Pembelian (RB)',
  },
  PAYMENT: {
    table: 'payment_batches',
    numberColumn: 'batch_number',
    dateColumn: 'payment_date',
    statusExpression: 't.posting_status',
    // payment_batches SENGAJA tidak punya customer_id/supplier_id di header
    // — pihak di-resolve PER BARIS pembayaran (KONTEKS_REVISI_2026-07-28.md
    // §2.12, lihat komentar entity PaymentBatch). NULL dengan sengaja.
    partyExpression: 'NULL::text',
    amountExpression: 't.total_amount',
    label: 'Pembayaran (PAY)',
  },
  JOURNAL_ENTRY: {
    table: 'journal_entries',
    numberColumn: 'entry_number',
    dateColumn: 'entry_date',
    // journal_entries TIDAK PERNAH punya baris berstatus VOIDED — pembatalan
    // selalu berupa baris jurnal pembalik BARU dengan nomor sendiri
    // (VoidEngineService, CLAUDE.md §2.1/§2.2). Baris ini sendiri, begitu
    // ada, selamanya POSTED — literal, bukan kolom.
    statusExpression: "'POSTED'",
    // Tidak ada kolom pihak di journal_entries — description dipakai
    // sebagai pengganti yang paling informatif.
    partyExpression: 't.description',
    amountExpression:
      '(SELECT COALESCE(SUM(l.debit_amount), 0) FROM journal_entry_lines l WHERE l.journal_entry_id = t.id)',
    label: 'Jurnal (JE)',
  },
};

export type DocumentContinuityType = keyof typeof DOCUMENT_CONTINUITY_TYPES;

export const DOCUMENT_CONTINUITY_TYPE_KEYS = Object.keys(
  DOCUMENT_CONTINUITY_TYPES,
) as DocumentContinuityType[];

export function assertDocumentContinuityType(
  type: string,
): asserts type is DocumentContinuityType {
  if (!(DOCUMENT_CONTINUITY_TYPE_KEYS as string[]).includes(type)) {
    throw new Error(
      `"${type}" tidak terdaftar di DOCUMENT_CONTINUITY_TYPES — Sales Order ` +
        'dan Operational Expense memang sengaja dikecualikan (CLAUDE.md §2.16/§3).',
    );
  }
}
