<script setup lang="ts">
/**
 * Halaman QA sementara (Hari 10 FE) — bukti manual end-to-end <StepUpDialog>
 * + useStepUp() terhadap endpoint dummy backend
 * POST /authorization-requests/test-step-up-action (dibuat Hari 9, "HAPUS
 * begitu ada aksi step-up sungguhan" — lihat komentar di controller-nya).
 * HAPUS halaman ini begitu Hari 13/15/17/21 punya aksi step-up sungguhan
 * (BS->STORE / UNLOCK_PRINT / CASH_OUTFLOW / SELL_BELOW_COST) untuk diuji.
 * Tidak ditaruh di navigation.ts — diakses lewat URL langsung, sama seperti
 * qa/export-demo.vue.
 */
definePageMeta({ title: 'QA — Step-Up Demo' })

const api = useApi()
const { withStepUp } = useStepUp()

const status = ref<'idle' | 'pending' | 'success' | 'error' | 'cancelled'>('idle')
const errorMessage = ref('')
const executedBy = ref('')

async function trigger() {
  status.value = 'pending'
  errorMessage.value = ''
  try {
    const res = await withStepUp(headers =>
      api.post<{ ok: boolean, executedBy: string }>('/authorization-requests/test-step-up-action', {}, headers)
    )
    status.value = 'success'
    executedBy.value = res.executedBy
  } catch (err) {
    if (err instanceof StepUpCancelledError) {
      status.value = 'cancelled'
      return
    }
    status.value = 'error'
    errorMessage.value = getErrorMessage(err, 'Gagal memicu aksi.')
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-md">
    <h1 class="text-lg font-semibold">
      QA — Step-Up Demo
    </h1>
    <p class="text-sm text-muted">
      Login sebagai <strong>Operator</strong> lalu klik tombol di bawah — modal step-up wajib
      muncul. Buka tab lain login <strong>Supervisor</strong>/<strong>Master</strong> di halaman
      <NuxtLink
        to="/persetujuan"
        class="underline"
      >
        Antrian Persetujuan
      </NuxtLink>
      untuk menyetujui/menolak. Login Master/Supervisor sendiri di sini akan lolos langsung
      tanpa modal (CLAUDE.md §13: step-up hanya wajib untuk Operator).
    </p>

    <UButton
      :loading="status === 'pending'"
      @click="trigger"
    >
      Panggil Aksi (butuh step-up untuk Operator)
    </UButton>

    <UAlert
      v-if="status === 'success'"
      color="success"
      variant="subtle"
      icon="i-lucide-check"
      title="Berhasil"
      :description="`Dieksekusi oleh user id ${executedBy}`"
    />
    <UAlert
      v-else-if="status === 'error'"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Gagal"
      :description="errorMessage"
    />
    <UAlert
      v-else-if="status === 'cancelled'"
      color="neutral"
      variant="subtle"
      icon="i-lucide-x"
      title="Dibatalkan"
      description="Modal ditutup manual sebelum disetujui/ditolak."
    />
  </div>
</template>
