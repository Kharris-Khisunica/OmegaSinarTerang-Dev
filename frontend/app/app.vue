<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    // Ikon "store" Lucide, sama dengan logo sidebar (AppLogo.vue) — mengganti
    // favicon.ico placeholder template Nuxt UI (Hari 1).
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
  ],
  htmlAttrs: {
    lang: 'id'
  }
})

useSeoMeta({
  title: 'Omega Sinar Terang',
  description: 'Website operasional FMCG B2B grosir'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
