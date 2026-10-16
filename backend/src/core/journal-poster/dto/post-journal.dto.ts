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
  | 'CASH_TRANSFER'
  | 'KASBON_REPAYMENT'
  | 'STOCK_OPNAME'
  | 'VOID_REVERSAL'
  | 'REVISION_REVERSAL'
  | 'OPERATIONAL_EXPENSE_EDIT_REVERSAL';

export interface PostJournalLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  /**
   * Hari 18 — invarian baru berdampingan resolveArAccount() (ArAccountResolverService,
   * Hari 8): WAJIB diisi setiap kali baris ini menyentuh akun piutang seorang
   * pelanggan (Saldo Awal piutang, dan nanti Faktur Penjualan Hari 21/Retur
   * Penjualan Hari 23/Pembayaran Hari 26-27). Satu tempat lupa mengisi ->
   * ArAccountResolverService.getCustomerBalance() salah hitung tanpa error apa
   * pun. VoidEngineService meneruskan nilai ini apa adanya saat membalik jurnal.
   */
  customerId?: string | null;
}

export interface PostJournalDto {
  entryDate: Date;
  description?: string;
  sourceType: JournalSourceType;
  sourceId?: string | null;
  lines: PostJournalLineDto[];
  /** id user yang memicu posting — wajib, mengisi journal_entries.created_by. */
  createdBy: string;
  /**
   * Override ambang backdate PeriodLockValidatorService.validate() (default
   * settings.backdate_max_days) untuk sourceType tertentu — HANYA dipakai
   * operational-expenses (Hari 17, mundur 7 hari, disetujui klien khusus
   * modul ini). Modul lain jangan mengisi field ini.
   */
  periodLockMaxDaysOverride?: number;
  /**
   * Dipakai VoidEngineService (Hari 11) untuk menulis baris pembalik lewat
   * jalur validasi yang sama dengan posting biasa — jangan diisi manual di
   * luar VoidEngine. Default false/null kalau tidak diisi.
   */
  isReversal?: boolean;
  reversedEntryId?: string | null;
  voidReasonCode?: string | null;
  voidReasonNote?: string | null;
}
