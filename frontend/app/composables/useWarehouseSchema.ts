import type { FieldDef, SelectOption } from '~/types/crud-form'

interface CustomerOption {
  id: string
  code: string
  name: string
}

export const WAREHOUSE_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Gudang Toko', value: 'STORE' },
  { label: 'Barang Titipan Pelanggan', value: 'TITIPAN_PELANGGAN' },
  { label: 'Barang Rusak', value: 'BAD_STOCK' }
]

export const WAREHOUSE_TYPE_HINT: Record<string, string> = {
  STORE: 'Gudang toko — stok normal, dijual seperti biasa.',
  TITIPAN_PELANGGAN: 'Barang yang sudah dibeli & dibayar pelanggan tertentu, belum diambil. Wajib pilih pelanggan di bawah.',
  BAD_STOCK: 'Barang rusak/tidak layak jual. Nilainya tetap dihitung penuh, tidak diturunkan.'
}

/**
 * Skema form Warehouse (Hari 5) — mengganti skema percontohan Hari 3 yang field-nya
 * (`code`, `type`, `address`, `is_active`) TIDAK cocok dengan entity backend asli
 * (lihat backend/src/modules/warehouses/entities/warehouse.entity.ts): tidak ada
 * `code`/`address`, field sungguhan `name`/`warehouseType`/`customerId`/`isDefault`/
 * `isActive`.
 *
 * `customerId` hanya relevan untuk `warehouseType === 'TITIPAN_PELANGGAN'`
 * (CHECK constraint DB + validasi service `assertConsignmentCustomer` menolak kombinasi
 * lain) — disembunyikan lewat `showIf` (CrudFormPage Hari 5) supaya operator tidak
 * bingung mengisi field yang tidak relevan untuk gudang STORE/BAD_STOCK.
 */
export function useWarehouseSchema(): FieldDef[] {
  const api = useApi()

  return [
    { key: 'name', label: 'Nama Gudang', type: 'text', required: true, cols: 8 },
    {
      key: 'warehouseType',
      label: 'Tipe Gudang',
      type: 'select',
      required: true,
      cols: 4,
      options: WAREHOUSE_TYPE_OPTIONS,
      hint: 'STORE = gudang toko · TITIPAN_PELANGGAN = barang titipan pelanggan · BAD_STOCK = barang rusak.'
    },
    {
      key: 'customerId',
      label: 'Pelanggan Penitip',
      type: 'select',
      required: true,
      cols: 12,
      placeholder: 'Pilih pelanggan...',
      hint: 'Wajib diisi untuk gudang bertipe "Barang Titipan Pelanggan".',
      showIf: form => form.warehouseType === 'TITIPAN_PELANGGAN',
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<{ data: CustomerOption[] }>('/customers', { limit: 200 })
        return res.data.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))
      }
    },
    { key: 'isDefault', label: 'Gudang Default (untuk tipe ini)', type: 'switch', cols: 6, hint: 'Hanya satu gudang default per tipe — gudang lain dengan tipe sama otomatis dinonaktifkan default-nya.' },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}

/**
 * Form -> payload POST/PATCH /warehouses. `customerId` dipaksa `null` kalau tipe
 * bukan TITIPAN_PELANGGAN — mencegah nilai lama nyangkut di form kalau operator
 * pilih customer dulu lalu ganti tipe ke STORE/BAD_STOCK sebelum submit (backend
 * juga menolak kombinasi ini, tapi FE membersihkannya duluan supaya pesan error
 * tidak membingungkan).
 */
export function warehouseTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const isConsignment = form.warehouseType === 'TITIPAN_PELANGGAN'
  return {
    name: form.name,
    warehouseType: form.warehouseType,
    customerId: isConsignment ? form.customerId : null,
    isDefault: form.isDefault,
    isActive: form.isActive
  }
}
