<script setup lang="ts">
/**
 * Satu-satunya modal step-up di seluruh app (CLAUDE.md §13: "satu jalur
 * penanganan" untuk 412 dari StepUpGuard ATAUPUN StepUpService.requireApproval()
 * dipanggil di dalam service bisnis). Dipasang sekali di layouts/default.vue;
 * modul manapun yang butuh step-up cukup membungkus panggilan useApi() lewat
 * useStepUp().withStepUp(action) — modal ini bereaksi ke state bersama.
 *
 * Tidak pernah menampilkan angka batas (ambang kas besar, harga pokok, dst) —
 * hanya context_summary (kalimat yang sudah dihumankan pemanggil) dan pesan
 * status generik (CLAUDE.md §2.17/§5).
 */
const { state, cancel, dismiss } = useStepUp()
const { now } = useClockTick()

const secondsLeft = computed(() => {
  if (!state.value.expiresAt) return null
  const diff = Math.floor((new Date(state.value.expiresAt).getTime() - now.value) / 1000)
  return Math.max(0, diff)
})

const countdownLabel = computed(() => {
  if (secondsLeft.value === null) return 'Menghitung sisa waktu...'
  const m = Math.floor(secondsLeft.value / 60)
  const s = secondsLeft.value % 60
  return `Kedaluwarsa dalam ${m}:${String(s).padStart(2, '0')}`
})

const isTerminal = computed(() => ['rejected', 'expired', 'error'].includes(state.value.phase))

function onUpdateOpen(value: boolean) {
  // Ditutup lewat Esc/klik luar: perlakukan sama seperti tombol yang relevan
  // di fase itu, supaya request tidak pernah "menggantung" tanpa settle.
  if (value) return
  if (isTerminal.value) dismiss()
  else cancel()
}
</script>

<template>
  <UModal
    :open="state.open"
    :title="isTerminal ? 'Persetujuan Selesai' : 'Menunggu Persetujuan'"
    :description="state.contextSummary"
    :dismissible="false"
    @update:open="onUpdateOpen"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <p class="text-sm">
          {{ state.contextSummary }}
        </p>

        <div
          v-if="state.phase === 'polling'"
          class="flex flex-col gap-3"
        >
          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-4 animate-spin"
            />
            Menunggu persetujuan Supervisor atau Master...
          </div>
          <p class="text-xs text-muted">
            {{ countdownLabel }}
          </p>
        </div>

        <div
          v-else-if="state.phase === 'retrying'"
          class="flex items-center gap-2 text-sm text-muted"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-4 animate-spin"
          />
          Disetujui — melanjutkan aksi...
        </div>

        <UAlert
          v-else-if="state.phase === 'rejected'"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-x"
          title="Ditolak"
          :description="state.message"
        />
        <UAlert
          v-else-if="state.phase === 'expired'"
          color="warning"
          variant="subtle"
          icon="i-lucide-clock-alert"
          title="Waktu Habis"
          :description="state.message"
        />
        <UAlert
          v-else-if="state.phase === 'error'"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Tidak Bisa Dilanjutkan"
          :description="state.message"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          v-if="state.phase === 'polling'"
          color="neutral"
          variant="ghost"
          @click="cancel"
        >
          Batalkan
        </UButton>
        <UButton
          v-else-if="isTerminal"
          color="neutral"
          variant="solid"
          @click="dismiss"
        >
          Tutup
        </UButton>
      </div>
    </template>
  </UModal>
</template>
