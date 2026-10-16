import type { UnitChoice } from '~/utils/productUnitChoices'
import type { FieldDef, SelectOption } from '~/types/crud-form'

interface ProductOption {
  id: string
  code: string
  displayName: string
  isActive: boolean
  baseUnit: string
  unitConversions: { unitName: string, qtyInBaseUnit: string | number }[]
}

interface WarehouseOption {
  id: string
  warehouseType: string
  isDefault: boolean
}

// Diketik per SATUAN PILIHAN (need_fixing.md #28, default satuan terbesar);
// transformOut() mengonversi ke satuan dasar yang diterima backend.
interface StockLineRow {
  productId: string
  qty: number | null
  unitName: string | null
  unitCost: number | null
}

// need_fixing.md #21 — saldo awal piutang per pelanggan & hutang per supplier
// (backend sudah menerima receivableLines/payableLines sejak Hari 12).
interface PartyLineRow {
  partyId: string
  amount: number | null
  description: string
}
interface PartyOption { id: string, code?: string, displayCode?: string, name: string }

/**
 * Skema Halaman Saldo Awal (Hari 12, bentuk PALING SEDERHANA — tabel input
 * manual produk/qty/harga pokok lewat repeater `<CrudFormPage>` yang sudah
 * ada, BUKAN importir file; itu masih PR terbuka §4.1 KONTEKS_REVISI). Gudang
 * SELALU `STORE` default (CLAUDE.md §3 "Lokasi tidak dipilih per baris") —
 * tidak ada kolom gudang di tabel, di-resolve sekali di sini lewat field
 * tersembunyi yang loader-nya jalan saat mount (pola sama `brandNameCache`
 * di useProductSchema).
 *
 * Piutang per pelanggan & hutang per supplier ditambahkan need_fixing.md #21
 * (6 Okt 2026) sebagai dua repeater senada. Impor Excel ada di halaman
 * (pages/akuntansi/saldo-awal), bukan di skema ini.
 */
export function useOpeningBalanceSchema(): {
  schema: FieldDef[]
  transformOut: (form: Record<string, unknown>) => unknown
} {
  const api = useApi()
  const { format: qtyFmt } = useQty()
  let defaultWarehouseId: string | null = null
  // Diisi loader opsi produk di bawah — dipakai pilihan satuan per baris.
  const productMap = new Map<string, ProductOption>()
  function choicesFor(productId: unknown): UnitChoice[] {
    return typeof productId === 'string' ? unitChoicesForProduct(productMap.get(productId)) : []
  }

  const schema: FieldDef[] = [
    {
      key: '_defaultWarehouse',
      label: 'Gudang Default',
      type: 'select',
      showIf: () => false,
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<{ data: WarehouseOption[] }>('/warehouses', { limit: 100 })
        const store = res.data.find(w => w.warehouseType === 'STORE' && w.isDefault)
          ?? res.data.find(w => w.warehouseType === 'STORE')
        defaultWarehouseId = store?.id ?? null
        return []
      }
    },
    {
      key: 'stockLines',
      label: 'Saldo Awal Stok',
      type: 'repeater',
      cols: 12,
      hint: 'Isi produk, qty + satuan (default satuan terbesar), dan harga pokok per satuan yang dipilih. Sistem menyimpan stok dalam satuan dasar (qty × isi, harga pokok ÷ isi). Gudang otomatis STORE. Baris tanpa produk dipilih diabaikan saat disimpan.',
      repeaterColumns: [
        {
          key: 'productId',
          label: 'Produk',
          type: 'select',
          placeholder: 'Pilih produk...',
          options: async (): Promise<SelectOption[]> => {
            const res = await api.get<{ data: ProductOption[] }>('/products', { limit: 500 })
            productMap.clear()
            for (const p of res.data) productMap.set(p.id, p)
            return res.data
              .filter(p => p.isActive)
              .map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id }))
          },
          onChange: (row) => {
            row.unitName = choicesFor(row.productId)[0]?.name ?? null
          }
        },
        { key: 'qty', label: 'Qty', type: 'number', placeholder: '0' },
        {
          key: 'unitName',
          label: 'Satuan',
          type: 'select',
          placeholder: 'Satuan...',
          rowOptions: row => choicesFor(row.productId).map(u => ({
            label: u.factor === 1 ? u.name : `${u.name} (isi ${qtyFmt(u.factor)})`,
            value: u.name
          }))
        },
        { key: 'unitCost', label: 'Harga Pokok / Satuan', type: 'currency', placeholder: '0' }
      ]
    },
    {
      key: 'receivableLines',
      label: 'Saldo Awal Piutang',
      type: 'repeater',
      cols: 12,
      hint: 'Sisa piutang per pelanggan pada tanggal saldo awal. Akun piutang mengikuti setelan pelanggan. Baris tanpa pelanggan diabaikan.',
      repeaterColumns: [
        {
          key: 'partyId',
          label: 'Pelanggan',
          type: 'select',
          placeholder: 'Pilih pelanggan...',
          options: async (): Promise<SelectOption[]> => {
            const res = await api.get<{ data: PartyOption[] }>('/customers', { limit: 1000 })
            return res.data.map(c => ({ label: `${c.code ?? ''} - ${c.name}`, value: c.id }))
          }
        },
        { key: 'amount', label: 'Nominal', type: 'currency', placeholder: '0' },
        { key: 'description', label: 'Keterangan', type: 'text', placeholder: 'opsional' }
      ]
    },
    {
      key: 'payableLines',
      label: 'Saldo Awal Hutang',
      type: 'repeater',
      cols: 12,
      hint: 'Sisa hutang per supplier pada tanggal saldo awal. Baris tanpa supplier diabaikan.',
      repeaterColumns: [
        {
          key: 'partyId',
          label: 'Supplier',
          type: 'select',
          placeholder: 'Pilih supplier...',
          options: async (): Promise<SelectOption[]> => {
            const res = await api.get<{ data: PartyOption[] }>('/suppliers', { limit: 1000 })
            return res.data.map(sup => ({ label: `${sup.displayCode ?? ''} - ${sup.name}`, value: sup.id }))
          }
        },
        { key: 'amount', label: 'Nominal', type: 'currency', placeholder: '0' },
        { key: 'description', label: 'Keterangan', type: 'text', placeholder: 'opsional' }
      ]
    }
  ]

  function partyRows(value: unknown): PartyLineRow[] {
    return ((value as PartyLineRow[] | undefined) ?? [])
      .filter(row => typeof row.partyId === 'string' && row.partyId !== '')
  }

  function transformOut(form: Record<string, unknown>): unknown {
    const rows = ((form.stockLines as StockLineRow[] | undefined) ?? [])
      .filter(row => typeof row.productId === 'string' && row.productId !== '')

    if (rows.length > 0 && !defaultWarehouseId) {
      throw new Error('Gudang STORE default belum ditemukan — periksa data Gudang (Master Data > Gudang) sebelum submit saldo awal.')
    }

    return {
      receivableLines: partyRows(form.receivableLines).map(row => ({
        customerId: row.partyId,
        amount: Number(row.amount ?? 0),
        description: row.description?.trim() || undefined
      })),
      payableLines: partyRows(form.payableLines).map(row => ({
        supplierId: row.partyId,
        amount: Number(row.amount ?? 0),
        description: row.description?.trim() || undefined
      })),
      stockLines: rows.map((row) => {
        const factor = unitFactor(choicesFor(row.productId), row.unitName ?? undefined)
        return {
          productId: row.productId,
          warehouseId: defaultWarehouseId,
          // NUMERIC(16,4) di backend (CLAUDE.md §2.14) — dibulatkan ke 4 desimal.
          qtyBaseUnit: Math.round(Number(row.qty ?? 0) * factor * 10000) / 10000,
          unitCost: Math.round((Number(row.unitCost ?? 0) / factor) * 10000) / 10000
        }
      })
    }
  }

  return { schema, transformOut }
}
