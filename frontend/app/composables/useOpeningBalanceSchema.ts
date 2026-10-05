import type { FieldDef, SelectOption } from '~/types/crud-form'

interface ProductOption {
  id: string
  code: string
  displayName: string
  isActive: boolean
}

interface WarehouseOption {
  id: string
  warehouseType: string
  isDefault: boolean
}

interface StockLineRow {
  productId: string
  qtyBaseUnit: number | null
  unitCost: number | null
}

/**
 * Skema Halaman Saldo Awal (Hari 12, bentuk PALING SEDERHANA — tabel input
 * manual produk/qty/harga pokok lewat repeater `<CrudFormPage>` yang sudah
 * ada, BUKAN importir file; itu masih PR terbuka §4.1 KONTEKS_REVISI). Gudang
 * SELALU `STORE` default (CLAUDE.md §3 "Lokasi tidak dipilih per baris") —
 * tidak ada kolom gudang di tabel, di-resolve sekali di sini lewat field
 * tersembunyi yang loader-nya jalan saat mount (pola sama `brandNameCache`
 * di useProductSchema).
 *
 * Piutang/hutang saldo awal TIDAK ikut di sini — di luar lingkup tugas hari
 * ini (fokus eksplisit: "produk, qty, harga pokok"). Endpoint backend sudah
 * menerima `receivableLines`/`payableLines`, tinggal ditambah field repeater
 * senada kalau/ketika diminta.
 */
export function useOpeningBalanceSchema(): {
  schema: FieldDef[]
  transformOut: (form: Record<string, unknown>) => unknown
} {
  const api = useApi()
  let defaultWarehouseId: string | null = null

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
      hint: 'Isi produk, qty dalam satuan dasar, dan harga pokok per satuan dasar. Gudang otomatis STORE. Baris tanpa produk dipilih diabaikan saat disimpan.',
      repeaterColumns: [
        {
          key: 'productId',
          label: 'Produk',
          type: 'select',
          placeholder: 'Pilih produk...',
          options: async (): Promise<SelectOption[]> => {
            const res = await api.get<{ data: ProductOption[] }>('/products', { limit: 500 })
            return res.data
              .filter(p => p.isActive)
              .map(p => ({ label: `${p.displayName} (${p.code})`, value: p.id }))
          }
        },
        { key: 'qtyBaseUnit', label: 'Qty (satuan dasar)', type: 'number', placeholder: '0' },
        { key: 'unitCost', label: 'Harga Pokok / Satuan', type: 'currency', placeholder: '0' }
      ]
    }
  ]

  function transformOut(form: Record<string, unknown>): unknown {
    const rows = ((form.stockLines as StockLineRow[] | undefined) ?? [])
      .filter(row => typeof row.productId === 'string' && row.productId !== '')

    if (rows.length > 0 && !defaultWarehouseId) {
      throw new Error('Gudang STORE default belum ditemukan — periksa data Gudang (Master Data > Gudang) sebelum submit saldo awal.')
    }

    return {
      stockLines: rows.map(row => ({
        productId: row.productId,
        warehouseId: defaultWarehouseId,
        qtyBaseUnit: Number(row.qtyBaseUnit ?? 0),
        unitCost: Number(row.unitCost ?? 0)
      }))
    }
  }

  return { schema, transformOut }
}
