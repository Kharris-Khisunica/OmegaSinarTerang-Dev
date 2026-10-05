import type { FieldDef, SelectOption } from '~/types/crud-form'
import type { AccountRow } from '~/composables/useChartOfAccountsTree'
import {
  ACCOUNT_SUBTYPE_LABEL,
  ACCOUNT_TYPE_LABEL,
  NORMAL_BALANCE_LABEL
} from '~/composables/useChartOfAccountsTree'

const ACCOUNT_TYPE_OPTIONS: SelectOption[] = Object.entries(ACCOUNT_TYPE_LABEL)
  .map(([value, label]) => ({ label, value }))

const NORMAL_BALANCE_OPTIONS: SelectOption[] = Object.entries(NORMAL_BALANCE_LABEL)
  .map(([value, label]) => ({ label, value }))

const ACCOUNT_SUBTYPE_OPTIONS: SelectOption[] = Object.entries(ACCOUNT_SUBTYPE_LABEL)
  .map(([value, label]) => ({ label, value }))

// Hint singkat dipakai berulang oleh 5 flag "singular" (COA_USULAN §7.2,
// ditegakkan backend chart-of-accounts.service.ts assertSingularFlagsAvailable)
// — hanya boleh tepat satu akun aktif yang memegang tiap flag ini.
// `isReceivableAccount` SENGAJA tidak ikut (pengecualian eksplisit di
// backend: pelanggan boleh punya akun piutang custom masing-masing).
const SINGULAR_FLAG_HINT = 'Hanya boleh tepat satu akun aktif yang memegang ini — backend menolak kalau sudah dipegang akun lain.'

/**
 * Skema form Bagan Akun (Hari 18 lanjutan FE) — MASTER only (CLAUDE.md §5:
 * "Operator tidak pernah melihat layar ini", SUPERVISOR baca saja lewat
 * `bagan-akun/index.vue`, tidak pernah membuka form ini). Tidak ada
 * referensi screenshot untuk layar ini (docs/PANDUAN_UI.md §0) — bentuknya
 * diturunkan dari pola generik §5-§7 + `CrudFormPage`/`MasterDataCrudPage`
 * yang sudah dipakai modul master data lain.
 *
 * Enum + label Bahasa Indonesia (`ACCOUNT_TYPE_LABEL` dst.) dan `AccountRow`
 * di-reuse dari `useChartOfAccountsTree.ts` — jangan re-declare di sini.
 *
 * `accountSubtype`×`normalBalance` (COA_USULAN §7.1) TIDAK divalidasi/
 * di-auto-isi di FE — mesin skema (`CrudFormPage`) belum punya mekanisme
 * field-ke-field reaktif, dan menambahkannya untuk satu form ini saja
 * dianggap scope creep. Kombinasi salah tetap ditolak backend dengan pesan
 * Bahasa Indonesia yang jelas, muncul sebagai banner (lihat catatan di
 * `mapServerErrors`, pesannya tidak berprefiks nama field tunggal).
 */
export function useChartOfAccountsSchema(): FieldDef[] {
  const api = useApi()

  return [
    {
      key: 'code',
      label: 'Kode Akun',
      type: 'text',
      required: true,
      cols: 4,
      placeholder: '01.120.00001',
      hint: 'Format GG.KKK.JJJJJ (2-3-5 digit dipisah titik).'
    },
    { key: 'name', label: 'Nama Akun', type: 'text', required: true, cols: 8 },
    {
      key: 'accountType',
      label: 'Tipe Akun',
      type: 'select',
      required: true,
      cols: 4,
      options: ACCOUNT_TYPE_OPTIONS
    },
    {
      key: 'accountSubtype',
      label: 'Kelompok Laporan',
      type: 'select',
      required: true,
      cols: 4,
      hint: 'Menentukan Saldo Normal yang wajib cocok di sebelah kanan.',
      options: ACCOUNT_SUBTYPE_OPTIONS
    },
    {
      key: 'normalBalance',
      label: 'Saldo Normal',
      type: 'select',
      required: true,
      cols: 4,
      hint: 'Harus cocok dengan Kelompok Laporan — kombinasi salah ditolak saat disimpan.',
      options: NORMAL_BALANCE_OPTIONS
    },
    {
      key: 'parentId',
      label: 'Akun Induk',
      type: 'select',
      cols: 12,
      placeholder: '— Tidak ada (akun level teratas) —',
      hint: 'Akun induk harus akun header (Grup/Kategori) yang aktif, bukan akun Jenis (yang bisa dijurnal).',
      options: async (): Promise<SelectOption[]> => {
        const res = await api.get<AccountRow[]>('/chart-of-accounts')
        return res
          .filter(acc => !acc.isPostable && acc.isActive)
          .map(acc => ({ label: `${acc.code} - ${acc.name}`, value: acc.id }))
      }
    },
    {
      key: 'isPostable',
      label: 'Bisa Dijurnal Langsung (Akun Jenis)',
      type: 'switch',
      cols: 6,
      defaultValue: true,
      hint: 'Matikan untuk akun header (Grup/Kategori) — tidak bisa dijurnal, hanya mengelompokkan akun di bawahnya.'
    },
    { key: 'isActive', label: 'Aktif', type: 'switch', cols: 6, defaultValue: true },
    {
      key: 'isCashAccount',
      label: 'Akun Kas/Bank',
      type: 'switch',
      cols: 6,
      hint: 'Aktifkan untuk akun kas fisik atau rekening bank.'
    },
    {
      key: 'requiresOutflowApproval',
      label: 'Wajib Otorisasi Supervisor untuk Pengeluaran Besar',
      type: 'switch',
      cols: 6,
      hint: 'Untuk kas besar/bank — pengeluaran di atas ambang settings akan meminta persetujuan Supervisor sebelum diproses.'
    },
    {
      key: 'isReceivableAccount',
      label: 'Akun Piutang',
      type: 'switch',
      cols: 6,
      hint: 'Bisa dipilih pelanggan sebagai akun piutang custom (boleh lebih dari satu akun aktif).'
    },
    {
      key: 'isPayableAccount',
      label: 'Akun Hutang Usaha Utama',
      type: 'switch',
      cols: 6,
      hint: SINGULAR_FLAG_HINT
    },
    {
      key: 'isInventoryAccount',
      label: 'Akun Persediaan Utama',
      type: 'switch',
      cols: 6,
      hint: SINGULAR_FLAG_HINT
    },
    {
      key: 'isInputVatAccount',
      label: 'Akun PPN Masukan',
      type: 'switch',
      cols: 6,
      hint: SINGULAR_FLAG_HINT
    },
    {
      key: 'isPurchaseReturnDiffAccount',
      label: 'Akun Selisih Retur Pembelian',
      type: 'switch',
      cols: 6,
      hint: SINGULAR_FLAG_HINT
    },
    {
      key: 'isOpeningBalanceEquityAccount',
      label: 'Akun Penyeimbang Saldo Awal (Modal)',
      type: 'switch',
      cols: 6,
      hint: `${SINGULAR_FLAG_HINT} Dipakai otomatis saat submit Saldo Awal.`
    }
  ]
}

/**
 * Form -> payload POST/PATCH /chart-of-accounts. `parentId` kosong dibuang
 * dari payload (bukan dikirim `null`) — `CreateChartOfAccountDto.parentId`
 * memakai `@IsOptional() @IsUUID()` TANPA `@ValidateIf`, jadi `null` eksplisit
 * gagal validasi saat CREATE (class-validator `@IsOptional()` cuma
 * melewatkan `undefined`, bukan `null`). Konsekuensi yang disadari: form Ubah
 * tidak bisa dipakai untuk "melepas" akun dari induknya jadi level teratas
 * (`UpdateChartOfAccountDto` sebenarnya menerima `parentId: null` untuk itu)
 * — sesuai komentar backend sendiri ("hampir tidak pernah" dibutuhkan MASTER).
 * Kalau suatu saat dibutuhkan, jalurnya sementara manual lewat SQL.
 */
export function chartOfAccountTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...form }
  if (!payload.parentId) delete payload.parentId
  return payload
}
