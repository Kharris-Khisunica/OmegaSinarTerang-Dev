<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- rute lama /pembelian/retur/create
// TETAP HIDUP, merender komponen daftar yang sama dengan initial-open="entri".
// Seluruh logika entri (termasuk gerbang supplier N1) hidup di index.vue.
import ReturIndexPage from './index.vue'

definePageMeta({ title: 'Retur Pembelian', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <ReturIndexPage initial-open="entri" />
</template>
