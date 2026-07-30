<script setup lang="ts">
import type { AuthorizationRequest } from '~/types/authorization-request'

// CLAUDE.md §5: Supervisor tidak punya dashboard, hanya 3 menu — ini salah
// satunya. Polling 5 detik (bukan WebSocket) — supervisor selalu di
// jaringan yang sama (KONTEKS_REVISI §2.10), jadi ini cukup dan jauh lebih
// sederhana daripada WebSocket.
definePageMeta({ title: 'Antrian Persetujuan', roles: ['MASTER', 'SUPERVISOR'] })

const { listPending, approve, reject } = useAuthorizationRequests()
const { formatPayloadEntries } = usePayloadFormatter()
const { now } = useClockTick()
const toast = useToast()

const rows = ref<AuthorizationRequest[]>([])
const status = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function load() {
  if (status.value === 'idle') status.value = 'pending'
  try {
    rows.value = await listPending()
    status.value = 'success'
  } catch (err) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memuat antrian persetujuan.')
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  load()
  pollTimer = setInterval(load, 5000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function humanizeActionType(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now.value) / 1000))
}

function countdownLabel(expiresAt: string): string {
  const total = secondsLeft(expiresAt)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const expandedIds = ref(new Set<string>())
function toggleDetail(id: string) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

const rejectingId = ref<string | null>(null)
const rejectReason = ref('')
function startReject(id: string) {
  rejectingId.value = id
  rejectReason.value = ''
}
function cancelReject() {
  rejectingId.value = null
  rejectReason.value = ''
}

const busyId = ref<string | null>(null)

async function onApprove(row: AuthorizationRequest) {
  busyId.value = row.id
  try {
    await approve(row.id)
    toast.add({ title: 'Disetujui', description: row.contextSummary, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: 'Gagal menyetujui', description: getErrorMessage(err, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    busyId.value = null
  }
}

async function onReject(row: AuthorizationRequest) {
  if (!rejectReason.value.trim()) return
  busyId.value = row.id
  try {
    await reject(row.id, rejectReason.value.trim())
    toast.add({ title: 'Ditolak', description: row.contextSummary, color: 'warning' })
    cancelReject()
    await load()
  } catch (err) {
    toast.add({ title: 'Gagal menolak', description: getErrorMessage(err, 'Terjadi kesalahan.'), color: 'error' })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <h1 class="text-lg font-semibold">
      Antrian Persetujuan
    </h1>

    <div
      v-if="status === 'pending'"
      class="flex flex-col gap-2"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-20 w-full"
      />
    </div>

    <UEmpty
      v-else-if="status === 'error'"
      icon="i-lucide-alert-triangle"
      title="Gagal memuat antrian"
      :description="errorMessage"
      :actions="[{ label: 'Coba lagi', onClick: load }]"
    />

    <UEmpty
      v-else-if="!rows.length"
      icon="i-lucide-inbox"
      title="Tidak ada permintaan menunggu"
      description="Semua permintaan persetujuan sudah diproses."
    />

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <div
        v-for="row in rows"
        :key="row.id"
        class="border border-default rounded-lg p-4 flex flex-col gap-3"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1 min-w-0">
            <p class="font-medium break-words">
              {{ row.contextSummary }}
            </p>
            <div class="flex items-center gap-2 text-xs text-muted">
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ humanizeActionType(row.actionType) }}
              </UBadge>
              <span>Kedaluwarsa dalam {{ countdownLabel(row.expiresAt) }}</span>
            </div>
          </div>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :icon="expandedIds.has(row.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            @click="toggleDetail(row.id)"
          >
            Detail
          </UButton>
        </div>

        <div
          v-if="expandedIds.has(row.id)"
          class="border-t border-default pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <div
            v-for="entry in formatPayloadEntries(row.actionType, row.payload)"
            :key="entry.label"
            class="text-sm"
          >
            <span class="text-muted">{{ entry.label }}:</span>
            {{ entry.value }}
          </div>
        </div>

        <div
          v-if="rejectingId === row.id"
          class="border-t border-default pt-3 flex flex-col gap-2"
        >
          <UTextarea
            v-model="rejectReason"
            placeholder="Alasan penolakan (wajib)..."
            :rows="2"
          />
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="cancelReject"
            >
              Batal
            </UButton>
            <UButton
              color="error"
              size="sm"
              :disabled="!rejectReason.trim()"
              :loading="busyId === row.id"
              @click="onReject(row)"
            >
              Konfirmasi Tolak
            </UButton>
          </div>
        </div>

        <div
          v-else
          class="border-t border-default pt-3 flex justify-end gap-2"
        >
          <UButton
            color="error"
            variant="ghost"
            size="sm"
            :disabled="busyId === row.id"
            @click="startReject(row.id)"
          >
            Tolak
          </UButton>
          <UButton
            color="success"
            size="sm"
            :loading="busyId === row.id"
            @click="onApprove(row)"
          >
            Setujui
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
