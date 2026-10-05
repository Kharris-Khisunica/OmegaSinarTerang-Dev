/**
 * Allowlist tabel dokumen yang ikut kunci cetak generik (CLAUDE.md §2.16, 7
 * dokumen: JL/B1/GD/SJ/RJ/RB/PAY). Dipakai sebagai pagar sebelum nama tabel
 * diinterpolasi ke raw SQL di print-lock.service.ts — nama tabel TIDAK PERNAH
 * datang dari input user, tapi allowlist ini tetap murah dan mencegah typo
 * modul lain diam-diam lolos ke query mentah.
 *
 * Setiap tabel di sini WAJIB punya kolom (nama persis): posting_status,
 * print_status (enum NOT_PRINTED/PRINTED/PRINT_CANCELLED), print_count,
 * printed_at, revision_number, void_reason_code, void_reason_note. Tabel
 * dokumen yang belum ada (JL/SJ/RJ/RB/PAY, menyusul Hari 16-27) otomatis ikut
 * memakai mekanisme ini begitu ditambah ke daftar ini — tidak ada kode di
 * print-lock.service.ts yang perlu disentuh lagi.
 */
export const PRINT_LOCK_TABLES = [
  'purchase_invoices',
  'warehouse_mutations',
  'purchase_returns',
  'sales_invoices',
  'sales_returns',
  'delivery_orders',
  'payment_batches',
] as const;

export type PrintLockTable = (typeof PRINT_LOCK_TABLES)[number];

export function assertPrintLockTable(
  table: string,
): asserts table is PrintLockTable {
  if (!(PRINT_LOCK_TABLES as readonly string[]).includes(table)) {
    throw new Error(
      `"${table}" belum terdaftar di PRINT_LOCK_TABLES — tambahkan ke print-lock-tables.ts sebelum dipakai PrintLockService.`,
    );
  }
}
