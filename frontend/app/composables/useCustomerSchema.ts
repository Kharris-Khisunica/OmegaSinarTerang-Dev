import type { FieldDef, SelectOption } from '~/types/crud-form'

interface ChartOfAccountOption {
  id: string
  code: string
  name: string
  isActive: boolean
  isReceivableAccount: boolean
}

/**
 * Skema form Customer, dipakai bareng create & edit.
 *
 * `arAccountId` (CLAUDE.md §3): "Operator tidak pernah melihat field ini."
 * Digerbangi di level SCHEMA (field tidak dimasukkan ke array sama sekali
 * untuk non-MASTER) — BUKAN `showIf` (yang cuma `v-show`, elemen tetap ada
 * di DOM tersembunyi). DoD Hari 8 mensyaratkan field ini benar-benar tidak
 * ada di DOM untuk OPERATOR, jadi filter harus terjadi sebelum sampai ke
 * CrudFormPage. `GET /chart-of-accounts` juga sudah `@Roles(MASTER,
 * SUPERVISOR)` di backend (403 untuk OPERATOR) — dua lapis, bukan cuma FE.
 *
 * Opsinya disaring `isActive && isReceivableAccount` (CLAUDE.md §3: MASTER
 * "memilihnya dari dropdown tersaring hanya akun bertipe piutang yang
 * aktif") — endpoint COA memang flat array (bukan `{data,meta}` paginated,
 * lihat `ChartOfAccountsController.findAll()`), beda dari kebanyakan
 * endpoint list lain di project ini.
 */
export function useCustomerSchema(): FieldDef[] {
  const api = useApi()
  const { activeRole } = useAuthUser()

  const fields: FieldDef[] = [
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
    { key: 'province', label: 'Provinsi', type: 'text', cols: 4 }
  ]

  if (activeRole.value === 'MASTER') {
    fields.push({
      key: 'arAccountId',
      label: 'Akun Piutang',
      type: 'select',
      cols: 12,
      placeholder: 'Pakai akun piutang default',
      hint: 'Opsional — kosongkan untuk pakai akun piutang usaha default. Hanya menampilkan akun piutang yang aktif.',
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<ChartOfAccountOption[]>('/chart-of-accounts')
        return res
          .filter(acc => acc.isActive && acc.isReceivableAccount)
          .map(acc => ({ label: `${acc.code} - ${acc.name}`, value: acc.id }))
      }
    })
  }

  fields.push({ key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true })
  return fields
}
