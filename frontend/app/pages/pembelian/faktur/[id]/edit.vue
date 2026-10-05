<script setup lang="ts">
// Pembungkus tipis (paket R6, pola sama ../create.vue) -- layar entri PENUH
// yang sama dipakai ulang mode 'ubah', ter-prefill dari faktur (CLAUDE.md §6:
// jangan fork form kedua). Seluruh logika hidup di index.vue.
import FakturPembelianIndexPage from '../index.vue'

definePageMeta({ title: 'Ubah Faktur Pembelian', roles: ['MASTER', 'OPERATOR'] })

const route = useRoute()
const editReason = typeof route.query.reason === 'string' ? route.query.reason : undefined
</script>

<template>
  <FakturPembelianIndexPage
    :edit-invoice-id="route.params.id as string"
    :edit-reason="editReason"
  />
</template>
