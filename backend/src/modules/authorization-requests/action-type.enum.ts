/**
 * Daftar actionType yang sudah diketahui bakal butuh step-up otorisasi
 * (CLAUDE.md §13/§16/§17, KONTEKS_REVISI §2.1) — dibuat sekarang (Hari 9)
 * supaya modul Hari 13 (Mutasi BS->STORE), 15 (kunci cetak), 17 (kas besar),
 * dan 21 (jual di bawah harga pokok) semuanya memakai string yang sama,
 * bukan literal string yang gampang typo per modul.
 *
 * Enum ini murni kontrak nama. Implementasi pemanggilnya (payload matcher di
 * payload-matchers.ts, dan pemasangan @RequiresStepUp/StepUpService.
 * requireApproval() di controller/service sungguhan) menyusul di hari
 * masing-masing — lihat komentar di payload-matchers.ts.
 */
export enum ActionType {
  VOID_DOCUMENT = 'VOID_DOCUMENT',
  UNLOCK_PRINT = 'UNLOCK_PRINT',
  SELL_BELOW_COST = 'SELL_BELOW_COST',
  CASH_OUTFLOW = 'CASH_OUTFLOW',
  BS_TO_STORE = 'BS_TO_STORE',
}
