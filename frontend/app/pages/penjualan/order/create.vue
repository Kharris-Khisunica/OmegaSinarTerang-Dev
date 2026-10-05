<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- rute /penjualan/order/create
// merender komponen daftar yang sama dengan initial-open="entri", pola
// persis gudang/mutasi/create.vue. Seluruh logika entri hidup di index.vue.
import OrderIndexPage from './index.vue'

definePageMeta({ title: 'Order Penjualan', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <OrderIndexPage initial-open="entri" />
</template>
