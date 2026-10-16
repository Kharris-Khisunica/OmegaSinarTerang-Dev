const SENSITIVE_KEY_PATTERN = /threshold|batas|limit|cost|hpp/i

// Kunci *Id (sourceId, accountId, customerId, fromWarehouseId, ...) berisi UUID
// mentah yang tidak bisa dinilai supervisor — disembunyikan. Nama dokumen/akun/
// pelanggan yang manusiawi sudah ada di contextSummary yang tampil di atasnya.
const HIDDEN_KEY_PATTERN = /Id$/

const FIELD_LABELS: Record<string, string> = {
  amount: 'Nominal',
  sourceType: 'Jenis Dokumen',
  intent: 'Tujuan',
  invoiceDate: 'Tanggal Faktur',
  lines: 'Jumlah Baris'
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  SALES_INVOICE: 'Faktur Penjualan',
  PURCHASE_INVOICE: 'Faktur Pembelian',
  SALES_ORDER: 'Sales Order',
  DELIVERY_ORDER: 'Surat Jalan',
  SALES_RETURN: 'Retur Penjualan',
  PURCHASE_RETURN: 'Retur Pembelian',
  PAYMENT: 'Penerimaan/Pengeluaran Kas',
  WAREHOUSE_MUTATION: 'Mutasi Gudang',
  CASH_TRANSFER: 'Pindah Buku Kas',
  OPERATIONAL_EXPENSE: 'Biaya Operasional'
}

const INTENT_LABELS: Record<string, string> = {
  EDIT: 'Ubah',
  VOID: 'VOID'
}

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function humanizeValue(key: string, value: unknown, rupiah: (v: number) => string): string {
  if (value === null || value === undefined) return '-'
  if (key === 'amount' && typeof value === 'number') return rupiah(value)
  if (key === 'sourceType' && typeof value === 'string') return SOURCE_TYPE_LABELS[value] ?? value
  if (key === 'intent' && typeof value === 'string') return INTENT_LABELS[value] ?? value
  if (key === 'invoiceDate' && typeof value === 'string') return formatDate(value)
  if (Array.isArray(value)) return `${value.length} baris`
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
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key) && !HIDDEN_KEY_PATTERN.test(key))
      .map(([key, value]) => ({
        label: humanizeKey(key),
        value: humanizeValue(key, value, rupiah)
      }))
  }

  return { formatPayloadEntries }
}
