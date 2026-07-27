// Union ini akan tumbuh seiring modul transaksi baru (urutan resmi di
// PROGRESS.md §4 "Urutan yang diharapkan"). Bukan enum DB (kolom source_type
// tetap VARCHAR bebas) — union di sini murni bantuan tipe di sisi TypeScript,
// jangan dianggap sumber kebenaran skema.
export type JournalSourceType =
  | 'MANUAL'
  | 'OPENING_BALANCE'
  | 'PURCHASE_INVOICE'
  | 'PURCHASE_RETURN'
  | 'SALES_INVOICE'
  | 'SALES_RETURN'
  | 'OPERATIONAL_EXPENSE'
  | 'PAYMENT'
  | 'VOID_REVERSAL';

export interface PostJournalLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface PostJournalDto {
  entryDate: Date;
  description?: string;
  sourceType: JournalSourceType;
  sourceId?: string | null;
  lines: PostJournalLineDto[];
  /** id user yang memicu posting — wajib, mengisi journal_entries.created_by. */
  createdBy: string;
}
