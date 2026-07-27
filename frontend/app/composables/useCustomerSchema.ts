import type { FieldDef, SelectOption } from '~/types/crud-form'

interface ChartOfAccountOption {
  id: string
  code: string
  name: string
}

/**
 * Skema form Customer (Hari 4), dipakai bareng create & edit.
 * `arAccountId` memuat opsi dari GET /chart-of-accounts — endpoint itu BELUM
 * ada (CRUD penuh COA baru Hari 15, lihat komentar di ChartOfAccount entity),
 * jadi select ini akan kosong sampai saat itu. CrudFormPage menelan error
 * loader opsi dengan aman, form tetap bisa dipakai tanpa field ini terisi.
 * Begitu endpoint COA ada: `CustomersService.assertReceivableAccount` menolak
 * akun yang `isActive=false` atau `isReceivableAccount=false` — filter query
 * ini di endpoint (atau di loader di bawah) supaya operator tidak memilih
 * akun yang pasti ditolak backend.
 */
export function useCustomerSchema(): FieldDef[] {
  const api = useApi()

  return [
    { key: 'name', label: 'Nama Customer', type: 'text', required: true, cols: 8 },
    { key: 'code', label: 'Kode', type: 'text', required: true, cols: 4, hint: 'Kode unik, diketik manual.' },
    {
      key: 'phone',
      label: 'No. Telepon',
      type: 'text',
      cols: 6,
      placeholder: '081234567890',
      hint: 'Format Indonesia, tanpa spasi/strip. Contoh: 081234567890 atau +6281234567890.'
    },
    { key: 'isPkp', label: 'PKP (Pengusaha Kena Pajak)', type: 'switch', cols: 6, hint: 'Aktifkan kalau customer ini kena PPN.' },
    { key: 'address', label: 'Alamat Lengkap', type: 'textarea', cols: 12, placeholder: 'Nama jalan, nomor, RT/RW, patokan, dsb.' },
    { key: 'district', label: 'Kecamatan', type: 'text', cols: 4 },
    { key: 'city', label: 'Kota', type: 'text', cols: 4 },
    { key: 'province', label: 'Provinsi', type: 'text', cols: 4 },
    {
      key: 'arAccountId',
      label: 'Akun Piutang',
      type: 'select',
      cols: 12,
      placeholder: 'Pakai akun piutang default',
      hint: 'Opsional — kosongkan untuk pakai akun piutang usaha default.',
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<{ data: ChartOfAccountOption[] }>('/chart-of-accounts', { limit: 200 })
        return res.data.map(acc => ({ label: `${acc.code} - ${acc.name}`, value: acc.id }))
      }
    },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true }
  ]
}
