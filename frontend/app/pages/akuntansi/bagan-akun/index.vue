<script setup lang="ts">
import type { AccountRow } from '~/composables/useChartOfAccountsTree'
import { buildAccountTree } from '~/composables/useChartOfAccountsTree'

definePageMeta({ title: 'Bagan Akun', roles: ['MASTER', 'SUPERVISOR'] })

const api = useApi()
const accounts = ref<AccountRow[]>([])
const status = ref<'pending' | 'success' | 'error'>('pending')
const errorMessage = ref('')

async function load() {
  status.value = 'pending'
  try {
    accounts.value = await api.get<AccountRow[]>('/chart-of-accounts')
    status.value = 'success'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat data.')
  }
}
onMounted(load)

const tree = computed(() => buildAccountTree(accounts.value))

const parentOf = computed(() => {
  const map = new Map<string, string | null>()
  for (const a of accounts.value) map.set(a.id, a.parentId)
  return map
})

// `Record<string, boolean>` (bukan `Set`) supaya reaktivitas Vue jalan
// langsung per-key tanpa perlu reassign referensi baru tiap toggle.
const expanded = reactive<Record<string, boolean>>({})

function expandAll() {
  for (const a of accounts.value) expanded[a.id] = true
}
function collapseAll() {
  for (const a of accounts.value) expanded[a.id] = false
}

const search = ref('')
const matchedIds = computed<Set<string> | null>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return null
  const ids = new Set<string>()
  for (const a of accounts.value) {
    if (a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) ids.add(a.id)
  }
  return ids
})

// Saat mencari: hanya tampilkan hasil + leluhurnya (supaya tetap terlihat di
// tree), dan paksa expand semua leluhur itu otomatis.
const visibleIds = computed<Set<string> | null>(() => {
  if (!matchedIds.value) return null
  const visible = new Set<string>()
  for (const id of matchedIds.value) {
    let current: string | null | undefined = id
    while (current) {
      visible.add(current)
      current = parentOf.value.get(current) ?? null
    }
  }
  return visible
})

function isVisible(node: { id: string }) {
  return visibleIds.value ? visibleIds.value.has(node.id) : true
}
function isExpanded(node: { id: string }) {
  if (matchedIds.value) return true
  return !!expanded[node.id]
}
function toggle(id: string) {
  expanded[id] = !expanded[id]
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-lg font-semibold">
        Bagan Akun
      </h1>
      <div class="flex items-center gap-2">
        <UInput
          v-model="search"
          placeholder="Cari kode/nama akun..."
          icon="i-lucide-search"
          class="w-64"
        />
        <UButton
          icon="i-lucide-unfold-vertical"
          color="neutral"
          variant="outline"
          size="sm"
          @click="expandAll"
        >
          Expand semua
        </UButton>
        <UButton
          icon="i-lucide-fold-vertical"
          color="neutral"
          variant="outline"
          size="sm"
          @click="collapseAll"
        >
          Collapse semua
        </UButton>
      </div>
    </div>

    <div
      v-if="status === 'pending'"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-8 w-full"
      />
    </div>
    <UEmpty
      v-else-if="status === 'error'"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat data"
      :description="errorMessage"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />
    <UEmpty
      v-else-if="!tree.length"
      icon="i-lucide-inbox"
      title="Belum ada akun"
    />
    <UEmpty
      v-else-if="matchedIds && matchedIds.size === 0"
      icon="i-lucide-search-x"
      title="Tidak ada akun yang cocok"
      :description="`Tidak ada kode/nama akun yang mengandung '${search}'.`"
    />
    <div
      v-else
      class="overflow-x-auto border border-default rounded-lg"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th class="px-3 py-2 text-left font-medium">
              Kode
            </th>
            <th class="px-3 py-2 text-left font-medium">
              Nama
            </th>
            <th class="px-3 py-2 text-left font-medium">
              Tipe
            </th>
            <th class="px-3 py-2 text-right font-medium">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          <ChartOfAccountsTreeNode
            v-for="node in tree"
            :key="node.id"
            :node="node"
            :depth="0"
            :is-expanded="isExpanded"
            :is-visible="isVisible"
            :toggle="toggle"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>
