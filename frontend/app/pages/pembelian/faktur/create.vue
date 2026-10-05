<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- rute lama /pembelian/faktur/create
// TETAP HIDUP, merender komponen daftar yang sama dengan initial-open="entri".
// Seluruh logika entri hidup di index.vue.
import FakturIndexPage from './index.vue'

definePageMeta({ title: 'Faktur Pembelian', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <FakturIndexPage initial-open="entri" />
</template>
