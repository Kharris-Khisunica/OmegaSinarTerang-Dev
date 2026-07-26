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
    { label: 'Gudang', icon: 'i-lucide-warehouse', to: '/master-data/warehouses' }
  ],
  [
    { label: 'Pengaturan', icon: 'i-lucide-settings', to: '/pengaturan', roles: ['MASTER'] }
  ]
]
