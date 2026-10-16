<script setup lang="ts">
import { navigationGroups, type NavItem } from '~/config/navigation'

interface SidebarGroup {
  label: string
  value: string
  children: NavItem[]
}
type SidebarEntry = NavItem | SidebarGroup

function isSidebarGroup(entry: SidebarEntry): entry is SidebarGroup {
  return 'value' in entry
}

const { user, logout } = useAuth()
const { activeRole } = useAuthUser()
const router = useRouter()

function groupValue(title: string): string {
  return `group:${title}`
}

// Grup bersarang (UNavigationMenu `children`, Nuxt UI 4.10) menggantikan
// bekas item `type:'label'` yang cuma judul statis — sekarang tiap grup jadi
// trigger yang bisa dilipat. Penyaringan `roles` tetap di LEVEL ANAK: grup
// yang seluruh anaknya tersaring habis untuk role aktif TIDAK ikut muncul
// sebagai induk kosong (CLAUDE.md §5 — Supervisor cuma boleh lihat 3 item).
const links = computed<SidebarEntry[]>(() =>
  navigationGroups.flatMap((section): SidebarEntry[] => {
    const visibleItems = section.items.filter(item => !item.roles || item.roles.includes(activeRole.value))
    if (visibleItems.length === 0) return []
    if (!section.title) return visibleItems
    return [{ label: section.title, value: groupValue(section.title), children: visibleItems }]
  })
)

// Status buka/tutup grup per pengguna (docs/RENCANA_REVISI_TESTING_KLIEN.md
// §3 R1 item G1) — default SEMUA grup terbuka. localStorage di-scope per
// `username` (bukan global) karena satu PC operator dipakai bergantian oleh
// beberapa role (CLAUDE.md §1 "PC operator merangkap server").
const storageKey = computed(() => `sidebar-open-groups:${user.value?.username ?? 'anon'}`)

function loadStoredOpenGroups(): string[] | null {
  try {
    const raw = localStorage.getItem(storageKey.value)
    return raw === null ? null : (JSON.parse(raw) as string[])
  } catch {
    return null
  }
}

function allCurrentGroupValues(): string[] {
  return links.value.filter(isSidebarGroup).map(g => g.value)
}

// Nilai awal HARUS sama persis antara server render dan hydration client
// (semua grup terbuka) — localStorage baru dibaca di onMounted (murni
// client, sesudah hydration selesai). Membacanya saat setup() akan beda
// antara server (tidak ada localStorage -> selalu "semua terbuka") dan
// client (bisa saja sudah ada preferensi tersimpan) -> hydration mismatch
// yang, pada UNavigationMenu bersarang ini, terbukti merusak event handler
// di bagian lain halaman (tombol "Entri" berhenti merespons klik).
const openGroups = ref<string[]>(allCurrentGroupValues())
const seenGroupValues = new Set(openGroups.value)

onMounted(() => {
  const stored = loadStoredOpenGroups()
  if (stored !== null) {
    openGroups.value = stored
    seenGroupValues.clear()
    for (const v of stored) seenGroupValues.add(v)
  }
})

// Grup baru yang belum pernah dilihat pengguna ini (mis. role berubah, atau
// menu baru ditambah) ikut default terbuka -- tidak menimpa preferensi
// tertutup yang sudah disimpan untuk grup yang sudah ada.
watch(links, (newLinks) => {
  let changed = false
  const next = [...openGroups.value]
  for (const item of newLinks) {
    if (isSidebarGroup(item) && !seenGroupValues.has(item.value)) {
      seenGroupValues.add(item.value)
      next.push(item.value)
      changed = true
    }
  }
  if (changed) openGroups.value = next
})

watch(openGroups, (v) => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(v))
  } catch {
    // localStorage penuh/nonaktif -- bukan fatal, cuma preferensi tampilan.
  }
}, { deep: true })

const userMenuItems = [
  [
    {
      label: 'Keluar',
      icon: 'i-lucide-log-out',
      onSelect: async () => {
        await logout()
        await router.push('/login')
      }
    }
  ]
]
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="main-sidebar"
      collapsible
      resizable
      :min-size="12"
      :default-size="16"
      :max-size="20"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <AppLogo :collapsed="collapsed" />
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu
          v-model="openGroups"
          :items="links"
          type="multiple"
          orientation="vertical"
        />
      </template>

      <template #footer>
        <UColorModeButton />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="main-panel">
      <template #header>
        <UDashboardNavbar title="Omega Sinar Terang">
          <template #right>
            <UDropdownMenu
              v-if="user"
              :items="userMenuItems"
            >
              <UButton
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-chevron-down"
              >
                <div class="text-left leading-tight">
                  <p class="text-sm font-medium">
                    {{ user.fullName }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ ROLE_LABEL[user.role] ?? user.role }}
                  </p>
                </div>
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>

      <template #footer>
        <StatusBar />
      </template>
    </UDashboardPanel>

    <StepUpDialog />
  </UDashboardGroup>
</template>
