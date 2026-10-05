<script setup lang="ts">
// Layout kosong untuk halaman nota cetak (Hari 13+) — tanpa sidebar/topbar/
// StepUpDialog dari layouts/default.vue. @page di sini A4 portrait (2 nota
// A5 landscape ditumpuk, dipotong mendatar, CLAUDE.md §6) — dipakai bareng
// semua halaman cetak dokumen mendatang (Hari 15+: JL, B1, SJ, RJ, RB, PAY),
// jangan taruh apa pun yang spesifik Mutasi Gudang di sini.
</script>

<template>
  <div class="min-h-screen bg-white text-black">
    <slot />
  </div>
</template>

<style>
@page {
  size: A4 portrait;
  margin: 0;
}
</style>
