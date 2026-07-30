const now = ref(Date.now())
let started = false

/**
 * Satu jam dinding dibagi seluruh app (bukan setInterval per komponen) —
 * dipakai countdown TTL di halaman Antrian Persetujuan dan <StepUpDialog>.
 * Pola singleton module-level sama seperti `refreshPromise` di useApi.ts.
 */
export function useClockTick() {
  if (!started && import.meta.client) {
    started = true
    setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
  return { now: readonly(now) }
}
