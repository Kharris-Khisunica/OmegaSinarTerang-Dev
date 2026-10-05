export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export type NormalBalance = 'DEBIT' | 'CREDIT'

// Seksi laporan (Hari 17A, docs/COA_USULAN.md §7) — dipakai kolom "Kelompok
// Laporan" dan validasi arah saldo Hari 18. Nilai + urutan persis §7 backend
// (backend/src/modules/chart-of-accounts/entities/chart-of-account.entity.ts).
export type AccountSubtype
  = | 'CURRENT_ASSET'
    | 'FIXED_ASSET'
    | 'ACCUMULATED_DEPRECIATION'
    | 'NON_OPERATING_ASSET'
    | 'CURRENT_LIABILITY'
    | 'LONG_TERM_LIABILITY'
    | 'NON_OPERATING_LIABILITY'
    | 'EQUITY'
    | 'CONTRA_EQUITY'
    | 'REVENUE'
    | 'CONTRA_REVENUE'
    | 'COGS'
    | 'SELLING_EXPENSE'
    | 'ADMIN_EXPENSE'
    | 'OWNER_EXPENSE'
    | 'OTHER_INCOME'
    | 'OTHER_EXPENSE'

export interface AccountRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  accountType: AccountType
  normalBalance: NormalBalance
  accountSubtype: AccountSubtype
  // Header (Grup/Kategori) kalau false — JournalPosterService menolaknya di
  // backend (CLAUDE.md §2.6). FE memakainya untuk membedakan tampilan baris
  // DAN untuk menyaring picker akun mana pun (lihat isSelectableAccount()).
  isPostable: boolean
  parentId: string | null
  isActive: boolean
}

export interface AccountNode extends AccountRow {
  children: AccountNode[]
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Kewajiban',
  EQUITY: 'Modal',
  INCOME: 'Pendapatan',
  EXPENSE: 'Beban'
}

export const NORMAL_BALANCE_LABEL: Record<NormalBalance, string> = {
  DEBIT: 'Debet',
  CREDIT: 'Kredit'
}

// Bahasa manusia untuk "Kelompok Laporan" (COA_USULAN §7) — teks persis sama
// dengan kolom "Kelompok Laporan" di docs/COA_Usulan_OmegaSinarTerang.xlsx,
// supaya operator/MASTER membaca istilah yang sama dengan dokumen yang
// diserahkan ke klien.
export const ACCOUNT_SUBTYPE_LABEL: Record<AccountSubtype, string> = {
  CURRENT_ASSET: 'Aset Lancar',
  FIXED_ASSET: 'Aset Tetap',
  ACCUMULATED_DEPRECIATION: 'Akumulasi Penyusutan',
  NON_OPERATING_ASSET: 'Aset Non-Usaha',
  CURRENT_LIABILITY: 'Liabilitas Jangka Pendek',
  LONG_TERM_LIABILITY: 'Liabilitas Jangka Panjang',
  NON_OPERATING_LIABILITY: 'Liabilitas Non-Usaha',
  EQUITY: 'Ekuitas',
  CONTRA_EQUITY: 'Kontra Ekuitas',
  REVENUE: 'Pendapatan',
  CONTRA_REVENUE: 'Kontra Pendapatan',
  COGS: 'Harga Pokok Penjualan',
  SELLING_EXPENSE: 'Beban Penjualan & Distribusi',
  ADMIN_EXPENSE: 'Beban Umum & Administrasi',
  OWNER_EXPENSE: 'Beban Pribadi Pemilik',
  OTHER_INCOME: 'Pendapatan Lain-lain',
  OTHER_EXPENSE: 'Beban Lain-lain'
}

// Akun header (Grup/Kategori, is_postable=false) tidak boleh dipilih di
// picker akun mana pun — memilihnya adalah cara paling cepat operator
// membuat jurnal yang tidak bisa dibaca siapa pun (Hari 17A). Dipakai
// sekarang oleh ChartOfAccountsTreeNode.vue, dan wajib dipakai ulang oleh
// picker akun CRUD COA (Hari 18) — jangan menulis filter `isPostable`
// terpisah di tempat lain.
export function isSelectableAccount(account: Pick<AccountRow, 'isPostable'>): boolean {
  return account.isPostable
}

/** Susun daftar flat akun (dengan `parentId`) jadi tree, urut `code` tiap level. */
export function buildAccountTree(accounts: AccountRow[]): AccountNode[] {
  const byId = new Map<string, AccountNode>()
  for (const account of accounts) byId.set(account.id, { ...account, children: [] })

  const roots: AccountNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRec = (list: AccountNode[]) => {
    list.sort((a, b) => a.code.localeCompare(b.code))
    list.forEach(node => sortRec(node.children))
  }
  sortRec(roots)
  return roots
}
