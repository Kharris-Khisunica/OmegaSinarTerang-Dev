<script setup lang="ts">
// Pembungkus tipis (PANDUAN_UI.md §16.1) -- rute lama /gudang/mutasi/create
// TETAP HIDUP supaya bookmark/tautan lama tidak mati, tapi merender komponen
// DAFTAR yang sama dengan initial-open="entri" sehingga yang muncul adalah
// pola baku: daftar di belakang + modal Entri terbuka di atasnya (bukan
// halaman form terpisah). Seluruh logika entri hidup di index.vue.
import MutasiIndexPage from './index.vue'

definePageMeta({ title: 'Mutasi Gudang', roles: ['MASTER', 'OPERATOR'] })
</script>

<template>
  <MutasiIndexPage initial-open="entri" />
</template>
