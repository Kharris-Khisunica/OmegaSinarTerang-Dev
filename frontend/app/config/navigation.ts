import type { Role } from '~/types/auth'

export interface NavItem {
  label: string
  icon: string
  to: string
  /** Kosong/undefined = semua role login boleh lihat menu ini. */
  roles?: Role[]
}

/** Dikelompokkan jadi beberapa baris di UNavigationMenu (dipisah divider). */
export const navigationGroups: NavItem[][] = [
  [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
    { label: 'Produk', icon: 'i-lucide-package', to: '/master-data/products' },
    { label: 'Customer', icon: 'i-lucide-users', to: '/master-data/customers' },
    { label: 'Supplier', icon: 'i-lucide-truck', to: '/master-data/suppliers' },
    { label: 'Gudang', icon: 'i-lucide-warehouse', to: '/master-data/warehouses' }
  ],
  [
    { label: 'Bagan Akun', icon: 'i-lucide-list-tree', to: '/akuntansi/bagan-akun', roles: ['MASTER', 'SUPERVISOR'] },
    { label: 'Jurnal', icon: 'i-lucide-book-text', to: '/akuntansi/jurnal' }
  ],
  [
    { label: 'Pengaturan', icon: 'i-lucide-settings', to: '/pengaturan', roles: ['MASTER'] }
  ]
]
