<script setup lang="ts">
import type { BreadcrumbItem } from '~/composables/useBreadcrumbs'

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
  <nav
    v-if="items.length > 1"
    aria-label="Breadcrumb"
    class="flex items-center gap-1 text-xs text-muted"
  >
    <template
      v-for="(item, i) in items"
      :key="i"
    >
      <UIcon
        v-if="i > 0"
        name="i-lucide-chevron-right"
        class="size-3.5 shrink-0"
      />
      <NuxtLink
        v-if="item.to"
        :to="item.to"
        class="hover:text-default hover:underline"
      >
        {{ item.label }}
      </NuxtLink>
      <span
        v-else
        :class="{ 'text-default font-medium': i === items.length - 1 }"
      >
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>
