import type { FieldDef, SelectOption } from '~/types/crud-form'

interface ChartOfAccountOption {
  id: string
  code: string
  name: string
  isActive: boolean
  isReceivableAccount: boolean
}

function isArAccountLocked(form: Record<string, unknown>): boolean {
  const balance = form.arAccountBalance
  return typeof balance === 'number' && Math.round(balance * 100) !== 0
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
  const { format: formatRupiah } = useRupiah()

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nama Pelanggan', type: 'text', required: true, cols: 8, uppercase: true },
    {
      key: 'code',
      label: 'Kode',
      type: 'text',
      cols: 4,
      placeholder: 'Kosongkan lalu klik Bangkitkan, atau ketik manual',
      hint: 'Kosongkan untuk dibangkitkan otomatis oleh sistem saat disimpan.',
      // Pola sama dengan Kode Produk/Merek/Satuan/Salesman — backend
      // membangkitkan dari customer_code_seq saat create kalau kosong.
      // CATATAN: belum dipindah ke field.autoCode (docs/RENCANA_REVISI_TESTING_KLIEN.md
      // §3 R1 M2 eksplisit hanya menyebut useSimpleMasterSchema.ts + useProductSchema.ts) —
      // kandidat follow-up, mekanismenya sudah siap dipakai di CrudFormPage.vue.
      action: {
        icon: 'i-lucide-sparkles',
        label: 'Bangkitkan',
        onClick: (_form, setField) => setField('code', '')
      }
    },
    {
      key: 'phone',
      label: 'No. Telepon',
      type: 'text',
      cols: 6,
      placeholder: '081234567890',
      hint: 'Format Indonesia, tanpa spasi/strip. Contoh: 081234567890 atau +6281234567890.'
    },
    { key: 'isPkp', label: 'PKP (Pengusaha Kena Pajak)', type: 'switch', cols: 6, hint: 'Aktifkan kalau customer ini kena PPN.' },
    { key: 'address', label: 'Alamat Lengkap', type: 'textarea', cols: 12, placeholder: 'Nama jalan, nomor, RT/RW, patokan, dsb.', uppercase: true },
    { key: 'district', label: 'Kecamatan', type: 'text', cols: 4, uppercase: true },
    { key: 'city', label: 'Kota', type: 'text', cols: 4, uppercase: true },
    { key: 'province', label: 'Provinsi', type: 'text', cols: 4, uppercase: true }
  ]

  if (activeRole.value === 'MASTER') {
    // Metadata dari server (GET /customers/:id → arAccountBalance, lihat
    // CustomersService.findOneWithBalance), tidak ditampilkan — dipakai
    // disabled/hint arAccountId di bawah. Pola sama isCodeLocked
    // (useProductSchema.ts). Selalu null saat create (pelanggan baru,
    // belum ada baris jurnal) sehingga field tidak pernah terkunci di sana.
    fields.push({ key: 'arAccountBalance', label: 'Saldo Piutang (internal)', type: 'number', showIf: () => false })
    fields.push({
      key: 'arAccountId',
      label: 'Akun Piutang',
      type: 'select',
      cols: 12,
      placeholder: 'Pakai akun piutang default',
      // CLAUDE.md §3: "Dikunci selama saldo pelanggan belum nol." Backend
      // (assertBalanceIsZero) sudah menolak PATCH-nya dengan 400 kalau
      // dilanggar — ini mengunci di FE SEBELUM submit supaya operator tidak
      // perlu mencoba dulu untuk tahu alasannya.
      disabled: form => isArAccountLocked(form),
      hint: form => (isArAccountLocked(form)
        ? `Terkunci — masih ada saldo piutang ${formatRupiah(form.arAccountBalance as number)}. Lunasi dulu sebelum memindahkan akun piutang.`
        : 'Opsional — kosongkan untuk pakai akun piutang usaha default. Hanya menampilkan akun piutang yang aktif.'),
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

/**
 * Form -> payload POST/PATCH /customers. Kosong (baru atau setelah klik
 * "Bangkitkan") -> jangan kirim `code` sama sekali (pola sama dengan
 * productTransformOut/simpleMasterTransformOut): backend membangkitkan kode
 * otomatis saat CREATE kalau tidak dikirim; saat UPDATE, kode yang ada
 * dibiarkan seperti semula sampai operator mengetik nilai baru.
 */
export function customerTransformOut(form: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...form }
  if (!form.code) delete payload.code
  // arAccountBalance: carrier baca-saja (lihat useCustomerSchema()), bukan
  // field pelanggan sungguhan — jangan pernah ikut terkirim ke server.
  delete payload.arAccountBalance
  return payload
}
