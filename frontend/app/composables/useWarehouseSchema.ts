import type { FieldDef } from '~/types/crud-form'

/**
 * Skema percontohan Hari 3 untuk membuktikan CrudFormPage — dipakai bareng oleh
 * halaman create & edit supaya tidak duplikasi. Field sungguhan menyusul Hari 4
 * saat backend CRUD Warehouses ada.
 */
export function useWarehouseSchema(): FieldDef[] {
  return [
    { key: 'code', label: 'Kode', type: 'text', required: true, cols: 6, placeholder: 'WH001' },
    { key: 'name', label: 'Nama Gudang', type: 'text', required: true, cols: 6 },
    {
      key: 'type',
      label: 'Tipe Gudang',
      type: 'select',
      required: true,
      cols: 6,
      options: [
        { label: 'Toko / Gudang Utama', value: 'STORE' },
        { label: 'Titipan Customer', value: 'CUSTOMER_CONSIGNMENT' },
        { label: 'Barang Rusak', value: 'BAD_STOCK' }
      ]
    },
    { key: 'is_active', label: 'Aktif', type: 'switch', cols: 6, hint: 'Nonaktifkan jika gudang tidak dipakai lagi.' },
    { key: 'address', label: 'Alamat', type: 'textarea', cols: 12 }
  ]
}
