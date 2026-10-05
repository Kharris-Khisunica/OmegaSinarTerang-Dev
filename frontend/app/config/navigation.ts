import type { Role } from '~/types/auth'

export interface NavItem {
  label: string
  icon: string
  to: string
  /** Kosong/undefined = semua role login boleh lihat menu ini. */
  roles?: Role[]
}

export interface NavSection {
  /** Kosong = tidak ada judul grup dirender (dipakai untuk item Dashboard lepas). */
  title?: string
  items: NavItem[]
}

/**
 * Dikelompokkan jadi beberapa seksi berjudul di UNavigationMenu
 * (PANDUAN_UI.md §4.1 — "judul grup ditampilkan, tidak cuma divider").
 *
 * CLAUDE.md §5: Supervisor tidak punya dashboard — nav-nya cuma 3 item
 * (Pengecekan Invoice, Antrian Persetujuan, Laporan). Karena itu SETIAP item
 * di luar 3 itu wajib `roles` eksplisit yang TIDAK menyertakan SUPERVISOR —
 * item tanpa `roles` otomatis kelihatan semua role login, termasuk dia.
 */
export const navigationGroups: NavSection[] = [
  {
    // Tanpa judul — Dashboard tidak ada padanan di menu sistem lama (§4.1),
    // dipertahankan sebagai item lepas supaya akses yang sudah ada tidak hilang.
    items: [
      { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/', roles: ['MASTER', 'OPERATOR'] }
    ]
  },
  {
    title: 'MASTER DATA',
    items: [
      { label: 'Produk', icon: 'i-lucide-package', to: '/master-data/products', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Merek', icon: 'i-lucide-tag', to: '/master-data/brands', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Satuan', icon: 'i-lucide-ruler', to: '/master-data/units', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Pelanggan', icon: 'i-lucide-users', to: '/master-data/customers', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Supplier', icon: 'i-lucide-truck', to: '/master-data/suppliers', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Salesman', icon: 'i-lucide-id-card', to: '/master-data/salesmen', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Gudang', icon: 'i-lucide-warehouse', to: '/master-data/warehouses', roles: ['MASTER', 'OPERATOR'] },
      // Kendaraan -- Hari 24, dipakai Surat Jalan. "Agen" (sopir) sempat
      // dibangun sebagai master terpisah di sini, tapi digabung ke Salesman
      // (koreksi 26 Sep 2026: agen dan salesman adalah orang yang sama) --
      // Surat Jalan sekarang memilih dari /master-data/salesmen di atas.
      { label: 'Kendaraan', icon: 'i-lucide-car', to: '/master-data/vehicles', roles: ['MASTER', 'OPERATOR'] }
    ]
  },
  {
    title: 'TRANSAKSI',
    items: [
      // Grup transaksi gudang — bukan master data (punya riwayat+cetak, bukan
      // sekadar edit), jadi bukan bagian grup pertama. Baris permission matrix
      // yang sama (Retur, Payment, Surat Jalan, Biaya Operasional, Hari 16+)
      // menyusul di grup ini juga, bukan ditaruh di master-data.
      { label: 'Order Penjualan', icon: 'i-lucide-clipboard-list', to: '/penjualan/order', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Faktur Penjualan', icon: 'i-lucide-receipt', to: '/penjualan/faktur', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Retur Penjualan', icon: 'i-lucide-undo-2', to: '/penjualan/retur', roles: ['MASTER', 'OPERATOR'] },
      // Surat Jalan (Hari 24-25) -- dibuat DARI faktur PENGIRIMAN, bukan dari
      // halaman ini (tidak ada tombol Entri di sana). Urutan grup persis
      // PANDUAN_UI.md §4.1: "... Retur Penjualan · Surat Jalan · Pembelian ...".
      { label: 'Surat Jalan', icon: 'i-lucide-truck', to: '/penjualan/surat-jalan', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Mutasi Gudang', icon: 'i-lucide-arrow-left-right', to: '/gudang/mutasi', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Faktur Pembelian', icon: 'i-lucide-shopping-cart', to: '/pembelian/faktur', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Retur Pembelian', icon: 'i-lucide-undo-2', to: '/pembelian/retur', roles: ['MASTER', 'OPERATOR'] }
    ]
  },
  {
    // PANDUAN_UI.md §4.1. Penerimaan Kas & Pengeluaran Kas (Hari 26) -- step 1
    // saja (pilih pihak + preview alokasi), belum ada Simpan/Konfirmasi
    // (POST /payments/confirm menyusul Hari 27).
    title: 'KAS & BANK',
    items: [
      { label: 'Penerimaan Kas', icon: 'i-lucide-arrow-down-circle', to: '/kas-bank/penerimaan', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Pengeluaran Kas', icon: 'i-lucide-arrow-up-circle', to: '/kas-bank/pengeluaran', roles: ['MASTER', 'OPERATOR'] },
      { label: 'Biaya Operasional', icon: 'i-lucide-wallet', to: '/kas-bank/biaya-operasional', roles: ['MASTER', 'OPERATOR'] },
      // Pindah Buku Kas (paket R9, menyerap Hari 32A) -- pemindahan antar
      // akun kas/bank milik sendiri, kode dokumen `PB`.
      { label: 'Pindah Buku Kas', icon: 'i-lucide-repeat', to: '/kas-bank/pindah-buku', roles: ['MASTER', 'OPERATOR'] }
    ]
  },
  {
    title: 'AKUNTANSI',
    items: [
      // Bagan Akun sengaja MASTER-only DI NAV (turun dari ['MASTER','SUPERVISOR'])
      // supaya tidak ikut nongol di sidebar Supervisor. Halaman itu sendiri
      // (definePageMeta) TETAP roles ['MASTER','SUPERVISOR'] sesuai matriks §5 —
      // Supervisor masih bisa buka lewat URL langsung, cuma bukan lewat nav.
      { label: 'Bagan Akun', icon: 'i-lucide-list-tree', to: '/akuntansi/bagan-akun', roles: ['MASTER'] },
      { label: 'Jurnal', icon: 'i-lucide-book-text', to: '/akuntansi/jurnal', roles: ['MASTER', 'OPERATOR'] },
      // Saldo Awal MASTER-only (Permission Matrix §5) — endpoint POST/GET-verify sudah ada
      // sejak Hari 12 BE, layar impor file masih PR terbuka (KONTEKS_REVISI §4.1).
      { label: 'Saldo Awal', icon: 'i-lucide-package-plus', to: '/akuntansi/saldo-awal', roles: ['MASTER'] }
    ]
  },
  {
    title: 'PENGECEKAN',
    items: [
      { label: 'Pengecekan Invoice', icon: 'i-lucide-clipboard-check', to: '/pengecekan-invoice', roles: ['MASTER', 'SUPERVISOR'] },
      { label: 'Antrian Persetujuan', icon: 'i-lucide-shield-check', to: '/persetujuan', roles: ['MASTER', 'SUPERVISOR'] }
    ]
  },
  {
    title: 'LAPORAN',
    items: [
      { label: 'Laporan', icon: 'i-lucide-bar-chart-3', to: '/laporan' }
    ]
  },
  {
    title: 'PENGATURAN',
    items: [
      { label: 'Pengaturan', icon: 'i-lucide-settings', to: '/pengaturan', roles: ['MASTER'] }
    ]
  }
]

/**
 * Halaman rumah per role — dipakai `01.roles.global.ts` saat redirect
 * unauthorized, supaya Supervisor (yang tidak punya akses `/`, lihat
 * Dashboard di atas) mendarat di halaman yang memang miliknya, bukan
 * bolak-balik ke `/` yang juga akan ditolak untuknya.
 */
export const ROLE_HOME: Record<Role, string> = {
  MASTER: '/',
  OPERATOR: '/',
  SUPERVISOR: '/pengecekan-invoice'
}
