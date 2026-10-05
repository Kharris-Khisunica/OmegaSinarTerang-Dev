<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- rute lama /penjualan/retur/create
// TETAP HIDUP, merender komponen daftar yang sama dengan initial-open="entri".
// Seluruh logika entri (termasuk gerbang faktur asal N1) hidup di index.vue.
import ReturIndexPage from './index.vue'

definePageMeta({ title: 'Retur Penjualan', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <ReturIndexPage initial-open="entri" />
</template>
