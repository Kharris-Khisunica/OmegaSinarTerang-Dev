import { navigationGroups } from '~/config/navigation'

export interface BreadcrumbItem {
  label: string
  to?: string
}

// Label grup untuk prefix path yang bukan kata biasa (folder teknis) —
// resource di dalamnya sudah punya label lewat navigationGroups, jadi
// tabel ini cuma untuk segmen PERTAMA path.
const SECTION_LABELS: Record<string, string> = {
  'master-data': 'Master Data',
  'akuntansi': 'Akuntansi',
  'gudang': 'Gudang'
}

const flatNav = navigationGroups.flatMap(section => section.items)

function labelForPath(path: string, fallback: string): string {
  return flatNav.find(item => item.to === path)?.label ?? fallback
}

/**
 * Diturunkan dari `route.path` + label menu (`config/navigation.ts`) — TIDAK
 * ada tabel breadcrumb terpisah yang perlu dirawat manual per halaman.
 * Pola: `/{section}/{resource}` -> [Section, Resource]; ditambah satu crumb
 * lagi kalau ini halaman create/edit (`.../create` atau `.../[id]/edit`),
 * labelnya dari `route.meta.title` ("Tambah X"/"Ubah X", sudah ada di semua
 * halaman lewat `definePageMeta`).
 */
export function useBreadcrumbs() {
  const route = useRoute()

  return computed<BreadcrumbItem[]>(() => {
    const segments = route.path.split('/').filter(Boolean)
    if (segments.length === 0) return []

    const [first, second, third, fourth] = segments
    const isSubPage = third === 'create' || fourth === 'edit'
    const section = first ? SECTION_LABELS[first] : undefined

    if (!section) {
      // Halaman datar tanpa grouping (mis. /persetujuan, /pengaturan).
      const label = (route.meta.title as string | undefined) ?? labelForPath(route.path, first ?? '')
      return [{ label }]
    }

    const resourcePath = `/${first}/${second}`
    const resourceLabel = labelForPath(resourcePath, second ?? '')
    const crumbs: BreadcrumbItem[] = [
      { label: section },
      { label: resourceLabel, to: isSubPage ? resourcePath : undefined }
    ]
    if (isSubPage) {
      const fallback = third === 'create' ? 'Tambah' : 'Ubah'
      crumbs.push({ label: (route.meta.title as string | undefined) ?? fallback })
    }
    return crumbs
  })
}
