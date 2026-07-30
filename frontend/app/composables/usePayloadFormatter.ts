const SENSITIVE_KEY_PATTERN = /threshold|batas|limit|cost|hpp/i

const FIELD_LABELS: Record<string, string> = {
  accountId: 'Akun',
  amount: 'Nominal'
}

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function humanizeValue(key: string, value: unknown, rupiah: (v: number) => string): string {
  if (key === 'amount' && typeof value === 'number') return rupiah(value)
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export interface PayloadEntry {
  label: string
  value: string
}

/**
 * Payload authorization_requests bukan untuk dokumentasi field-per-field —
 * ini dibaca Supervisor/Master saat memutuskan approve/reject, jadi wajib
 * berbentuk manusiawi (CLAUDE.md §16 semangatnya: konteks harus jelas
 * sebelum menyetujui). Kunci yang cocok /threshold|limit|.../ SENGAJA
 * disaring — jaring pengaman kalau suatu saat sebuah actionType baru
 * (Hari 13/15/17/21) menaruh angka batas di payload-nya: operator tidak
 * boleh pernah melihat angka itu (CLAUDE.md §2.17).
 */
export function usePayloadFormatter() {
  const { format: rupiah } = useRupiah()

  function formatPayloadEntries(actionType: string, payload: Record<string, unknown>): PayloadEntry[] {
    if (actionType === 'TEST_STEP_UP_ACTION') {
      return [{ label: 'Catatan', value: 'Aksi uji coba — tidak ada data transaksi sungguhan.' }]
    }

    // Payload generik dari StepUpGuard (mis. TEST_STEP_UP_ACTION lewat guard,
    // dan actionType lain begitu dipasangi @RequiresStepUp) berbentuk
    // { params, body } — ratakan satu level supaya tidak tampil sebagai JSON mentah.
    const flatSource
      = 'body' in payload && typeof payload.body === 'object' && payload.body !== null
        ? (payload.body as Record<string, unknown>)
        : payload

    return Object.entries(flatSource)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, value]) => ({
        label: humanizeKey(key),
        value: humanizeValue(key, value, rupiah)
      }))
  }

  return { formatPayloadEntries }
}
