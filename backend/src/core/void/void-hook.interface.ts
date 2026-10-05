import { EntityManager } from 'typeorm';

/**
 * Titik ekstensi per sourceType — modul dokumen (Pembelian Hari 14, Penjualan
 * Hari 21, dst.) mendaftar lewat VoidEngineService.registerHook() begitu
 * tabel dokumennya ada. VoidEngineService FAIL-CLOSED kalau sourceType belum
 * punya hook terdaftar (lihat void.service.ts).
 */
export interface VoidHook {
  /** Lempar kalau ada alasan modul-spesifik dokumen ini TIDAK boleh di-VOID
   * (mis. "sudah dicetak, wajib batal cetak dulu" — Hari 15). Tidak menulis apa pun. */
  checkVoidable(sourceId: string, manager: EntityManager): Promise<void>;

  /** Dipanggil TERAKHIR, setelah jurnal+stok berhasil dibalik — modul
   * menandai baris dokumennya sendiri VOIDED (kolom milik tabel dokumen
   * itu sendiri, bukan tanggung jawab VoidEngineService). */
  markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    userId: string,
    manager: EntityManager,
  ): Promise<void>;
}
