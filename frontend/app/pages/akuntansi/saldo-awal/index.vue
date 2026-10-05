<script setup lang="ts">
// Halaman Saldo Awal (Hari 12) — bentuk PALING SEDERHANA: tabel input manual
// (produk, qty, harga pokok) lewat repeater <CrudFormPage>, BUKAN importir
// Excel (klien belum memutuskan bentuknya, lihat PROGRESS.md §1). Halaman
// Jurnal Manual SENGAJA tidak dibangun hari ini — endpoint-nya sudah ada
// (POST /journal-entries/manual) tapi layarnya ditunda ke pasca-MVP
// (keputusan 29 Juli, CLAUDE.md §0).
definePageMeta({ title: 'Saldo Awal', roles: ['MASTER'] })

const api = useApi()
const { schema, transformOut } = useOpeningBalanceSchema()
const { format: formatRupiah } = useRupiah()

interface VerifyResult {
  lotValue: number
  ledgerValue: number
  difference: number
}

const verifyResult = ref<VerifyResult | null>(null)
const verifyError = ref('')

async function refreshVerify() {
  try {
    verifyResult.value = await api.get<VerifyResult>('/opening-balance/verify')
    verifyError.value = ''
  } catch (err) {
    verifyError.value = getErrorMessage(err, 'Gagal memuat verifikasi saldo awal.')
  }
}

onMounted(refreshVerify)
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <UAlert
      v-if="verifyError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-triangle"
      title="Verifikasi gagal dimuat"
      :description="verifyError"
    />
    <UAlert
      v-else-if="verifyResult"
      :color="verifyResult.difference === 0 ? 'success' : 'warning'"
      variant="subtle"
      :icon="verifyResult.difference === 0 ? 'i-lucide-check-circle-2' : 'i-lucide-alert-triangle'"
      :title="verifyResult.difference === 0
        ? 'Saldo awal seimbang'
        : `Selisih saldo awal: ${formatRupiah(verifyResult.difference)}`"
      :description="`Nilai lot pembuka ${formatRupiah(verifyResult.lotValue)} vs saldo akun Persediaan ${formatRupiah(verifyResult.ledgerValue)} (sumber: source_type = OPENING_BALANCE).`"
    />

    <CrudFormPage
      title="Saldo Awal"
      endpoint="/opening-balance"
      :schema="schema"
      back-to="/"
      :transform-out="transformOut"
      hide-save-and-new
      :on-success="refreshVerify"
    />
  </div>
</template>
