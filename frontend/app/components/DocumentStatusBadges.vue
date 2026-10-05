<script setup lang="ts">
// Tiga sumbu status TIDAK PERNAH dicampur jadi satu badge (CLAUDE.md §2.16) —
// posting/cetak/pengecekan berubah lewat mekanisme yang berbeda-beda dan
// operator perlu bisa membedakannya sekilas. Generik untuk 7 dokumen kunci
// cetak (JL/B1/GD/SJ/RJ/RB/PAY); reviewStatus opsional karena tidak semua
// dokumen kunci cetak punya sumbu pengecekan (mis. GD).
type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type ReviewStatus = 'BELUM_DICEK' | 'DISETUJUI' | 'BERMASALAH'

const props = defineProps<{
  postingStatus: PostingStatus
  printStatus: PrintStatus
  reviewStatus?: ReviewStatus
}>()

const POSTING_LABEL: Record<PostingStatus, string> = {
  POSTED: 'Terposting',
  VOIDED: 'Dibatalkan'
}
const POSTING_COLOR: Record<PostingStatus, 'success' | 'error'> = {
  POSTED: 'success',
  VOIDED: 'error'
}

const PRINT_LABEL: Record<PrintStatus, string> = {
  NOT_PRINTED: 'Belum Dicetak',
  PRINTED: 'Sudah Dicetak',
  PRINT_CANCELLED: 'Cetak Dibatalkan'
}
const PRINT_COLOR: Record<PrintStatus, 'neutral' | 'info' | 'warning'> = {
  NOT_PRINTED: 'neutral',
  PRINTED: 'info',
  PRINT_CANCELLED: 'warning'
}

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  BELUM_DICEK: 'Belum Dicek',
  DISETUJUI: 'Disetujui',
  BERMASALAH: 'Bermasalah'
}
const REVIEW_COLOR: Record<ReviewStatus, 'neutral' | 'success' | 'error'> = {
  BELUM_DICEK: 'neutral',
  DISETUJUI: 'success',
  BERMASALAH: 'error'
}

const postingLabel = computed(() => POSTING_LABEL[props.postingStatus])
const postingColor = computed(() => POSTING_COLOR[props.postingStatus])
const printLabel = computed(() => PRINT_LABEL[props.printStatus])
const printColor = computed(() => PRINT_COLOR[props.printStatus])
const reviewLabel = computed(() => (props.reviewStatus ? REVIEW_LABEL[props.reviewStatus] : null))
const reviewColor = computed(() => (props.reviewStatus ? REVIEW_COLOR[props.reviewStatus] : 'neutral'))
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <UBadge
      :color="postingColor"
      variant="subtle"
      icon="i-lucide-file-check-2"
    >
      {{ postingLabel }}
    </UBadge>
    <UBadge
      :color="printColor"
      variant="subtle"
      icon="i-lucide-printer"
    >
      {{ printLabel }}
    </UBadge>
    <UBadge
      v-if="reviewLabel"
      :color="reviewColor"
      variant="subtle"
      icon="i-lucide-clipboard-check"
    >
      {{ reviewLabel }}
    </UBadge>
  </div>
</template>
