<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- pola sama pembelian/faktur/create.vue
// & penjualan/order/create.vue. Seluruh logika entri hidup di index.vue.
import FakturPenjualanIndexPage from './index.vue'

definePageMeta({ title: 'Faktur Penjualan', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <FakturPenjualanIndexPage initial-open="entri" />
</template>
