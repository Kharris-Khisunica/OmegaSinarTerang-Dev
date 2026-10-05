import type { FieldDef, SelectOption } from '~/types/crud-form'

interface UnitConversionRow {
  unitName: string
  ratioToNext: number | null
}

interface ServerUnitConversion {
  unitName: string
  qtyInBaseUnit: string | number
  level: number
}

interface BrandOption {
  id: string
  name: string
  isActive: boolean
}

/**
 * Daftar tetap satuan ukuran kemasan (gr/ml/kg, CLAUDE.md §3 — "UoM kemasan",
 * BUKAN satuan jual/beli dari master `units` Hari 8). Deskriptif saja, tidak
 * pernah dihitung, jadi cukup daftar statis di FE, tidak butuh master/endpoint
 * tersendiri. Tambah baris di sini kalau klien butuh satuan kemasan baru.
 */
const PACKAGING_UOM_OPTIONS: SelectOption[] = [
  { label: 'gr', value: 'gr' },
  { label: 'kg', value: 'kg' },
  { label: 'ml', value: 'ml' },
  { label: 'liter', value: 'liter' },
  { label: 'pcs', value: 'pcs' }
]

function buildDisplayName(
  brandName: string | undefined,
  kemasan: unknown,
  keterangan: unknown,
  ukuran: unknown,
  uom: unknown
): string {
  const ukuranUom = [ukuran, uom]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .join(' ')
  return [brandName, kemasan, keterangan, ukuranUom]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .map(part => part.trim())
    .join(' ')
}

/**
 * Skema form Produk (rework Hari 8, urutan diperbarui paket R2). Mengganti
 * skema Hari 4 (`name` tunggal). Nama sekarang tersusun 4 bagian
 * (Merek + Kemasan + Keterangan + Ukuran+UoM, docs/RENCANA_REVISI_TESTING_KLIEN.md
 * §1 P1 dan §3 — CLAUDE.md §3 masih menyebut urutan lama, menunggu update R12)
 * dengan pratinjau `display_name` besar yang ter-update live —
 * operator wajib melihat nama akhir sebelum menyimpan (DoD hari ini), karena
 * kode produk dikunci permanen setelah transaksi pertama dan nama yang salah
 * ketik tidak semudah itu diperbaiki di lapangan.
 *
 * `brandNameCache` menyimpan nama merek per id dari hasil loader dropdown,
 * dipakai `compute()` pratinjau tanpa fetch ulang (loader jalan sekali saat
 * form mount, sebelum operator sempat mengetik).
 */
export function useProductSchema(): FieldDef[] {
  const api = useApi()
  const brandNameCache: Record<string, string> = {}

  return [
    {
      key: 'brandId',
      label: 'Merek',
      type: 'select',
      required: true,
      cols: 6,
      placeholder: 'Pilih merek...',
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<{ data: BrandOption[] }>('/brands', { limit: 200 })
        const active = res.data.filter(b => b.isActive)
        for (const b of active) brandNameCache[b.id] = b.name
        return active.map(b => ({ label: b.name, value: b.id }))
      }
    },
    { key: 'kemasan', label: 'Kemasan', type: 'text', cols: 6, placeholder: 'Sachet, Botol, Kaleng, dsb.' },
    { key: 'keterangan', label: 'Keterangan', type: 'text', cols: 6, placeholder: 'Putih, Cokelat, Original, dsb. (opsional)' },
    { key: 'ukuran', label: 'Ukuran', type: 'text', cols: 3, placeholder: '37' },
    {
      key: 'ukuranUomPart',
      label: 'Satuan Ukuran',
      type: 'select',
      cols: 3,
      placeholder: 'gr',
      options: PACKAGING_UOM_OPTIONS
    },
    {
      key: 'displayNamePreview',
      label: 'Pratinjau Nama Produk',
      type: 'display',
      cols: 12,
      compute: form => buildDisplayName(
        brandNameCache[form.brandId as string],
        form.kemasan,
        form.keterangan,
        form.ukuran,
        form.ukuranUomPart
      ) || 'Nama akan muncul di sini setelah Merek dan Kemasan diisi.'
    },
    {
      key: 'code',
      label: 'Kode Produk',
      type: 'text',
      cols: 6,
      hint: form => (form.isCodeLocked
        ? 'Terkunci — produk ini sudah pernah dipakai transaksi, kode tidak bisa diubah lagi.'
        : 'Format 10 digit YYMMDDXXXX. Dibangkitkan otomatis oleh sistem saat disimpan, kecuali sakelar "Isi kode manual" dinyalakan.'),
      disabled: form => form.isCodeLocked === true,
      // Field kode otomatis (docs/RENCANA_REVISI_TESTING_KLIEN.md §3 R1 item
      // M2) — terkunci total (sakelar disembunyikan) kalau produk sudah
      // dipakai transaksi pertama (CLAUDE.md §3, isCodeLocked dari server).
      autoCode: {
        locked: form => form.isCodeLocked === true
      }
    },
    {
      key: 'isBkp',
      label: 'Barang Kena Pajak (PPN dari supplier dihitung)',
      type: 'switch',
      cols: 6,
      hint: 'Aktifkan kalau produk ini dikenakan PPN saat dibeli dari supplier ber-PPN.'
    },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true },
    { key: 'baseUnit', label: 'Satuan Dasar (terkecil)', type: 'text', required: true, cols: 6, placeholder: 'pcs' },
    // Metadata dari server, tidak ditampilkan — dipakai disabled/hint/action di atas.
    { key: 'isCodeLocked', label: 'Kode Terkunci', type: 'switch', cols: 12, showIf: () => false },
    {
      key: 'unitConversions',
      label: 'Konversi Satuan Jual/Beli',
      type: 'repeater',
      cols: 12,
      hint: 'Format tiap baris: 1 [satuan besar] = [Isi] [satuan di bawahnya]. Urutkan dari PALING BESAR ke PALING KECIL (mis. dus, lalu renceng) — baris terakhir menuju satuan dasar. Baris dengan nama satuan kosong otomatis diabaikan saat disimpan.',
      repeaterColumns: [
        { key: 'unitName', label: 'Nama Satuan', type: 'text', placeholder: 'dus' },
        {
          key: 'ratioToNext',
          label: 'Isi',
          type: 'number',
          placeholder: ({ rows, rowIndex, form }) => {
            const nextUnit = (rows[rowIndex + 1]?.unitName as string) || (form.baseUnit as string) || 'satuan dasar'
            return `berapa ${nextUnit || 'satuan dasar'}?`
          }
        }
      ]
    }
  ]
}

/** Response GET /products/:id -> bentuk form (rasio bertingkat, urut besar ke kecil, ukuranUom dipecah). */
export function productTransformIn(data: Record<string, unknown>): Record<string, unknown> {
  const conversions = (data.unitConversions as ServerUnitConversion[] | undefined) ?? []
  // Urut level naik = kecil ke besar (konvensi backend, level 1 = satuan terkecil).
  const sortedSmallToBig = [...conversions].sort((a, b) => a.level - b.level)

  const withRatio: UnitConversionRow[] = sortedSmallToBig.map((c, index) => {
    const qty = Number(c.qtyInBaseUnit)
    const prevQty = index === 0 ? 1 : Number(sortedSmallToBig[index - 1]!.qtyInBaseUnit)
    return { unitName: c.unitName, ratioToNext: prevQty === 0 ? 0 : qty / prevQty }
  })

  const rows = withRatio.length ? [...withRatio].reverse() : [{ unitName: '', ratioToNext: null }]

  // ukuranUom disimpan server SEBAGAI SATU STRING gabungan (mis. "37 gr") — dipecah
  // kembali jadi ukuran+satuan HANYA kalau token terakhirnya cocok salah satu opsi
  // dropdown dikenal; kalau tidak, seluruh string ditaruh di "Ukuran" apa adanya
  // (aman untuk data lama/tidak baku, tidak pernah gagal parse).
  const ukuranUomRaw = String(data.ukuranUom ?? '').trim()
  const parts = ukuranUomRaw.split(/\s+/).filter(Boolean)
  const lastPart = parts[parts.length - 1] ?? ''
  const knownUom = ['gr', 'kg', 'ml', 'liter', 'pcs'].includes(lastPart)
  const ukuran = knownUom ? parts.slice(0, -1).join(' ') : ukuranUomRaw
  const ukuranUomPart = knownUom ? lastPart : ''

  return {
    ...data,
    ukuran,
    ukuranUomPart,
    unitConversions: rows
  }
}

/** Form -> payload POST/PATCH /products (baris kosong dibuang, rasio bertingkat -> qty absolut + level, ukuran+uom digabung lagi). */
export function productTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const rows = ((form.unitConversions as UnitConversionRow[] | undefined) ?? [])
    .filter(row => typeof row.unitName === 'string' && row.unitName.trim() !== '')

  const count = rows.length
  const withQty: { unitName: string, qtyInBaseUnit: number }[] = new Array(count)

  // Proses dari baris terakhir (satuan terkecil, dekat satuan dasar) ke baris pertama
  // (satuan terbesar), mengalikan rasio secara bertingkat ke atas.
  let runningQty: number | null = null
  for (let i = count - 1; i >= 0; i--) {
    const ratio = Number(rows[i]!.ratioToNext ?? 0)
    runningQty = runningQty === null ? ratio : ratio * runningQty
    withQty[i] = { unitName: rows[i]!.unitName.trim(), qtyInBaseUnit: runningQty }
  }

  // level 1 = satuan terkecil (baris terakhir), naik ke atas — konvensi backend tidak berubah.
  const unitConversions = withQty.map((row, index) => ({
    unitName: row.unitName,
    qtyInBaseUnit: row.qtyInBaseUnit,
    level: count - index
  }))

  const ukuran = typeof form.ukuran === 'string' ? form.ukuran.trim() : ''
  const uom = typeof form.ukuranUomPart === 'string' ? form.ukuranUomPart : ''
  const ukuranUom = [ukuran, uom].filter(Boolean).join(' ').trim()

  const payload: Record<string, unknown> = {
    brandId: form.brandId,
    keterangan: form.keterangan || undefined,
    kemasan: form.kemasan || undefined,
    ukuranUom: ukuranUom || undefined,
    isBkp: form.isBkp,
    baseUnit: form.baseUnit,
    isActive: form.isActive,
    unitConversions
  }
  // Kosong (mis. setelah klik "Bangkitkan") -> jangan kirim key ini sama sekali:
  // saat CREATE, backend membangkitkan kode otomatis kalau `code` tidak dikirim;
  // saat UPDATE, kode yang belum terkunci cukup dibiarkan seperti semula sampai
  // operator mengetik nilai baru (backend tidak membangkitkan ulang saat edit).
  if (form.code) payload.code = form.code

  return payload
}
