import type { AuthorizationRequest, StepUpErrorBody } from '~/types/authorization-request'

/** Operator membatalkan modal sendiri — bukan penolakan/kedaluwarsa. */
export class StepUpCancelledError extends Error {}
/** Supervisor/Master menolak permintaan. */
export class StepUpDeniedError extends Error {}
/** TTL 15 menit habis sebelum disetujui/dipakai. */
export class StepUpExpiredError extends Error {}

type StepUpPhase = 'polling' | 'retrying' | 'rejected' | 'expired' | 'error'

interface StepUpDialogState {
  open: boolean
  authorizationRequestId: string | null
  contextSummary: string
  phase: StepUpPhase
  message: string
  expiresAt: string | null
}

function initialState(): StepUpDialogState {
  return {
    open: false,
    authorizationRequestId: null,
    contextSummary: '',
    phase: 'polling',
    message: '',
    expiresAt: null
  }
}

const POLL_INTERVAL_MS = 5000

// Module-level (bukan di dalam useState) sengaja: satu-satunya alur step-up
// aktif per sesi browser (CLAUDE.md §13 — "satu jalur penanganan"), jadi
// timer & resolver promise cukup satu, sama seperti pola `refreshPromise`
// di useApi.ts.
let pollTimer: ReturnType<typeof setInterval> | undefined
let settle: { resolve: (v: unknown) => void, reject: (e: unknown) => void } | undefined

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

/**
 * Satu alur penanganan HTTP 412 dari MANA PUN (StepUpGuard maupun
 * StepUpService.requireApproval() dipanggil dari dalam service bisnis lain —
 * keduanya membalas body identik lewat stepUpRequiredException() di backend,
 * lihat CLAUDE.md §13). Dipakai lewat withStepUp(action): bungkus panggilan
 * useApi() apa pun yang mungkin butuh step-up; kalau backend membalas 412,
 * modal <StepUpDialog> otomatis muncul, polling status permintaan tiap 5
 * detik (GET /authorization-requests/:id — endpoint milik-sendiri, bukan
 * daftar antrian yang MASTER/SUPERVISOR-only), dan begitu APPROVED action
 * yang sama diulang otomatis dengan header `x-authorization-request-id`.
 */
export function useStepUp() {
  const state = useState<StepUpDialogState>('step-up-dialog', initialState)
  const { getOne } = useAuthorizationRequests()

  // Cuma menurunkan `open` — TIDAK me-reset contextSummary/phase/message di
  // saat yang sama. UModal beranimasi keluar beberapa ratus ms setelah
  // `open` jadi false; me-reset seluruh state serentak membuat isinya
  // "berkedip" balik ke fase awal (polling) selagi modal masih memudar.
  // State penuh ditimpa lagi begitu withStepUp() berikutnya membuka modal.
  function closeDialog() {
    stopPolling()
    state.value.open = false
  }

  /** Dipanggil tombol "Batalkan" saat masih menunggu — request TIDAK dikonsumsi, boleh disusulkan lagi nanti. */
  function cancel() {
    stopPolling()
    const s = settle
    settle = undefined
    closeDialog()
    s?.reject(new StepUpCancelledError('Dibatalkan operator.'))
  }

  /** Dipanggil tombol "Tutup" setelah status terminal (ditolak/kedaluwarsa/error) ditampilkan. */
  function dismiss() {
    closeDialog()
  }

  function settleTerminal(phase: 'rejected' | 'expired' | 'error', message: string, error: Error) {
    stopPolling()
    state.value.phase = phase
    state.value.message = message
    const s = settle
    settle = undefined
    s?.reject(error)
  }

  async function pollOnce<T>(id: string, action: (headers?: Record<string, string>) => Promise<T>) {
    let row: AuthorizationRequest
    try {
      row = await getOne(id)
    } catch {
      // Kegagalan jaringan sesaat tidak boleh membubarkan alur — coba lagi tick berikutnya.
      return
    }
    // Dialog sudah dibatalkan/ditutup, atau sudah diganti permintaan lain,
    // sebelum respons GET ini datang — jangan lanjutkan (mis. auto-retry
    // setelah operator sudah menekan "Batalkan").
    if (!state.value.open || state.value.authorizationRequestId !== id) return

    state.value.contextSummary = row.contextSummary
    state.value.expiresAt = row.expiresAt

    if (row.status === 'PENDING') return

    if (row.status === 'APPROVED') {
      stopPolling()
      state.value.phase = 'retrying'
      try {
        const result = await action({ 'x-authorization-request-id': id })
        const s = settle
        settle = undefined
        closeDialog()
        s?.resolve(result)
      } catch (err) {
        if (getErrorStatus(err) === 412) {
          // Isi transaksi berubah dari yang disetujui (CLAUDE.md §19) — request
          // ini TIDAK ikut terkonsumsi di backend, tapi tidak bisa dipakai untuk
          // isi yang baru. Operator harus mengulang dari awal.
          const body = getErrorData(err) as StepUpErrorBody | undefined
          settleTerminal(
            'error',
            body?.message ?? 'Isi permintaan berubah sejak disetujui — ulangi dari awal.',
            new Error(body?.message ?? 'Isi permintaan berubah sejak disetujui.')
          )
        } else {
          const s = settle
          settle = undefined
          closeDialog()
          s?.reject(err)
        }
      }
      return
    }

    if (row.status === 'REJECTED') {
      const msg = row.reason ? `Ditolak: ${row.reason}` : 'Permintaan ditolak Supervisor/Master.'
      settleTerminal('rejected', msg, new StepUpDeniedError(msg))
      return
    }

    if (row.status === 'EXPIRED') {
      const msg = 'Waktu persetujuan habis (15 menit). Ulangi aksinya dari awal.'
      settleTerminal('expired', msg, new StepUpExpiredError(msg))
      return
    }

    // EXECUTED — kasus langka (mis. tab lain memakainya lebih dulu).
    const msg = 'Permintaan ini sudah dieksekusi sebelumnya.'
    settleTerminal('error', msg, new Error(msg))
  }

  async function withStepUp<T>(action: (headers?: Record<string, string>) => Promise<T>): Promise<T> {
    try {
      return await action()
    } catch (err) {
      if (getErrorStatus(err) !== 412) throw err
      const body = getErrorData(err) as StepUpErrorBody | undefined
      if (!body?.authorizationRequestId) throw err

      if (state.value.open) {
        throw new Error('Masih ada permintaan persetujuan lain yang berjalan — selesaikan dulu.', { cause: err })
      }

      return new Promise<T>((resolve, reject) => {
        settle = { resolve: resolve as (v: unknown) => void, reject }
        state.value = {
          open: true,
          authorizationRequestId: body.authorizationRequestId,
          contextSummary: body.message,
          phase: 'polling',
          message: body.message,
          expiresAt: null
        }
        const id = body.authorizationRequestId
        void pollOnce(id, action)
        pollTimer = setInterval(() => void pollOnce(id, action), POLL_INTERVAL_MS)
      })
    }
  }

  return { state, withStepUp, cancel, dismiss }
}
