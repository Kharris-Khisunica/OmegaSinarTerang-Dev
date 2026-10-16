<script setup lang="ts">
/**
 * Tombol aksi dokumen generik untuk mekanisme kunci cetak (CLAUDE.md §2.16) —
 * dibuat SEKALI, dipakai 7 dokumen (JL/B1/GD/SJ/RJ/RB/PAY). Komponen ini TIDAK
 * TAHU apa pun tentang dokumen spesifik (tidak ada field/DTO faktur pembelian
 * di sini) — ia hanya membaca tiga sumbu status dan memberi tahu pemanggil
 * lewat event apa yang ingin dilakukan operator. Pemanggil (halaman detail
 * dokumen) yang tahu bentuk data dan memanggil endpoint sungguhan.
 *
 * Aturan tombol (persis CLAUDE.md §2.16):
 * - Cetak: SELALU ada, termasuk dokumen VOIDED (boleh dicetak ulang untuk
 *   arsip) — tombol yang tidak berlaku disembunyikan, bukan tombol Cetak.
 * - Dokumen VOIDED: Edit/VOID/Batal Cetak semua disembunyikan — dokumen
 *   sudah di status terminal, tidak ada lagi yang bisa "diapakan".
 * - Dokumen POSTED + PRINTED: Edit dan VOID DISEMBUNYIKAN (backend akan
 *   menolak 412 kalau dipanggil langsung) — diganti SATU tombol "Batal
 *   Cetak" yang memaksa niat dideklarasikan di depan sebelum apa pun terjadi.
 * - Dokumen POSTED + (NOT_PRINTED | PRINT_CANCELLED): Edit dan VOID bebas
 *   langsung, tanpa dialog niat (backend tidak memerlukan approval sama
 *   sekali kalau dokumen belum/tidak sedang dalam status PRINTED).
 * - `noEdit`: dokumen yang isinya tidak bisa diedit lewat kunci cetak (Surat
 *   Jalan — status kirimnya diubah lewat tombol sendiri yang bebas kunci
 *   cetak, need_fixing.md #18). Tombol Ubah dan niat "Diperbaiki" disembunyikan;
 *   Batal Cetak hanya untuk VOID.
 */
type PostingStatus = 'POSTED' | 'VOIDED'
type PrintStatus = 'NOT_PRINTED' | 'PRINTED' | 'PRINT_CANCELLED'
type UnlockIntent = 'EDIT' | 'VOID'

const props = defineProps<{
  postingStatus: PostingStatus
  printStatus: PrintStatus
  printLoading?: boolean
  noEdit?: boolean
}>()

const emit = defineEmits<{
  'print': []
  'edit': []
  'void': []
  'unlock-print': [payload: { intent: UnlockIntent, reason: string }]
}>()

const showEditVoidDirect = computed(
  () => props.postingStatus === 'POSTED' && props.printStatus !== 'PRINTED'
)
const showUnlockPrint = computed(
  () => props.postingStatus === 'POSTED' && props.printStatus === 'PRINTED'
)
const printLabel = computed(() =>
  props.postingStatus === 'VOIDED' ? 'Cetak Arsip' : 'Cetak'
)

const dialogOpen = ref(false)
const intent = ref<UnlockIntent | null>(null)
const reason = ref('')

const canSubmit = computed(() => intent.value !== null && reason.value.trim().length > 0)

function openUnlockDialog() {
  intent.value = props.noEdit ? 'VOID' : null
  reason.value = ''
  dialogOpen.value = true
}

function submitUnlock() {
  if (!canSubmit.value || intent.value === null) return
  emit('unlock-print', { intent: intent.value, reason: reason.value.trim() })
  dialogOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      icon="i-lucide-printer"
      color="neutral"
      variant="subtle"
      :loading="printLoading"
      @click="emit('print')"
    >
      {{ printLabel }}
    </UButton>

    <template v-if="showEditVoidDirect">
      <UButton
        v-if="!noEdit"
        icon="i-lucide-pencil"
        color="neutral"
        variant="subtle"
        @click="emit('edit')"
      >
        Ubah
      </UButton>
      <UButton
        icon="i-lucide-ban"
        color="error"
        variant="subtle"
        @click="emit('void')"
      >
        VOID
      </UButton>
    </template>

    <UButton
      v-if="showUnlockPrint"
      icon="i-lucide-lock-open"
      color="warning"
      variant="subtle"
      @click="openUnlockDialog"
    >
      Batal Cetak
    </UButton>

    <UModal
      v-model:open="dialogOpen"
      title="Batal Cetak"
      description="Dokumen ini sudah dicetak — nyatakan dulu mau diapakan sebelum melanjutkan."
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm">
            Mau diapakan setelah dibatalkan?
          </p>
          <UButtonGroup>
            <UButton
              v-if="!noEdit"
              :color="intent === 'EDIT' ? 'primary' : 'neutral'"
              :variant="intent === 'EDIT' ? 'solid' : 'subtle'"
              icon="i-lucide-pencil"
              @click="intent = 'EDIT'"
            >
              Diperbaiki
            </UButton>
            <UButton
              :color="intent === 'VOID' ? 'primary' : 'neutral'"
              :variant="intent === 'VOID' ? 'solid' : 'subtle'"
              icon="i-lucide-ban"
              @click="intent = 'VOID'"
            >
              Dibatalkan/VOID
            </UButton>
          </UButtonGroup>

          <UFormField
            label="Alasan"
            required
          >
            <UTextarea
              v-model="reason"
              class="w-full"
              placeholder="Kenapa dokumen ini perlu diperbaiki/dibatalkan?"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="dialogOpen = false"
          >
            Keluar
          </UButton>
          <UButton
            :disabled="!canSubmit"
            @click="submitUnlock"
          >
            Lanjutkan
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
