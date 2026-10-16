/**
 * VOID dokumen berkunci cetak yang bisa memicu DUA gerbang step-up
 * INDEPENDEN sekaligus (CLAUDE.md §2.13 + §2.16) — dipakai Faktur Penjualan,
 * Faktur Pembelian, Retur Penjualan/Pembelian, Surat Jalan, Penerimaan &
 * Pengeluaran Kas. Dulu tersalin di 7 halaman; disatukan 6 Okt 2026.
 *
 *   - UNLOCK_PRINT (header x-authorization-request-id) — semua role, HANYA
 *     kalau dokumen sudah PRINTED. preflight() di backend selalu dicek LEBIH
 *     DULU daripada gerbang VOID_DOCUMENT.
 *   - VOID_DOCUMENT (header x-void-authorization-request-id) — HANYA role
 *     OPERATOR, tidak peduli status cetak.
 *
 * useStepUp().withStepUp() generik cuma dirancang untuk SATU gerbang aktif
 * per panggilan (satu authorizationRequestId, satu header hardcoded
 * `x-authorization-request-id`). Operator + dokumen PRINTED butuh KEDUANYA.
 * Kalau dipakai polos berantai, retry OTOMATIS withStepUp() setelah gerbang
 * pertama disetujui akan memanggil endpoint sungguhan yang (untuk OPERATOR)
 * langsung memicu 412 KEDUA — dan pollOnce() di useStepUp.ts salah
 * menafsirkan 412 di tengah "retrying" sebagai "isi permintaan berubah sejak
 * disetujui" (kontrak CLAUDE.md §19), padahal itu gerbang lain yang sah.
 * Makanya ronde pertama SENGAJA tidak membiarkan retry-otomatis memanggil
 * endpoint sungguhan selama gerbang kedua masih mungkin menyusul.
 *
 * `isPrinted` diambil pemanggil dari state dokumen yang sudah dimuat —
 * menentukan gerbang mana yang SUNGGUH dipicu ronde pertama, tanpa menebak
 * dari isi 412. `callVoid(headers?)` = panggilan POST .../void milik halaman.
 */
export function useDualGateVoid() {
  const { withStepUp } = useStepUp()

  async function performDualGateVoid<T>(
    isPrinted: boolean,
    callVoid: (headers?: Record<string, string>) => Promise<T>
  ): Promise<T> {
    const firstHeaderKey = isPrinted ? 'x-authorization-request-id' : 'x-void-authorization-request-id'
    let firstHeaders: Record<string, string> = {}
    const SKIP = Symbol('void-round-one-skip')

    const roundOne = await withStepUp<T | typeof SKIP>(async (headers) => {
      if (headers) {
        // Gerbang ronde pertama sudah disetujui — SIMPAN headernya di slot
        // yang benar, tapi JANGAN panggil endpoint sungguhan di sini kalau
        // dokumen PRINTED (VOID_DOCUMENT untuk OPERATOR masih mungkin
        // menyusul). Ronde kedua di bawah yang memanggilnya.
        firstHeaders = { [firstHeaderKey]: headers['x-authorization-request-id'] as string }
        return SKIP
      }
      return callVoid()
    })
    // MASTER + belum dicetak: tidak ada gerbang sama sekali, sudah selesai.
    if (roundOne !== SKIP) return roundOne as T

    // Belum dicetak: ronde pertama SUDAH menyelesaikan satu-satunya gerbang
    // (VOID_DOCUMENT untuk OPERATOR).
    if (!isPrinted) return callVoid(firstHeaders)

    // PRINTED dan ronde pertama baru menyelesaikan UNLOCK_PRINT. Bukan
    // OPERATOR -> panggilan pertama di bawah langsung sukses (dialog tidak
    // pernah tampil untuk ronde ini).
    return withStepUp(headers => callVoid({
      ...firstHeaders,
      ...(headers ? { 'x-void-authorization-request-id': headers['x-authorization-request-id'] as string } : {})
    }))
  }

  return { performDualGateVoid }
}
