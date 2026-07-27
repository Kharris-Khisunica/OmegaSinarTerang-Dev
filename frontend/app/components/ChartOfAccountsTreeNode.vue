<script setup lang="ts">
import type { AccountNode } from '~/composables/useChartOfAccountsTree'
import { ACCOUNT_TYPE_LABEL } from '~/composables/useChartOfAccountsTree'

defineProps<{
  node: AccountNode
  depth: number
  isExpanded: (node: AccountNode) => boolean
  isVisible: (node: AccountNode) => boolean
  toggle: (id: string) => void
}>()
</script>

<template>
  <template v-if="isVisible(node)">
    <tr class="border-b border-default last:border-0 hover:bg-elevated/30">
      <td class="px-3 py-2">
        <div
          class="flex items-center gap-1"
          :style="{ paddingLeft: `${depth * 20}px` }"
        >
          <UButton
            v-if="node.children.length"
            :icon="isExpanded(node) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="isExpanded(node) ? 'Tutup' : 'Buka'"
            @click="toggle(node.id)"
          />
          <span
            v-else
            class="inline-block size-6"
          />
          <span class="font-mono text-xs">{{ node.code }}</span>
        </div>
      </td>
      <td class="px-3 py-2">
        {{ node.name }}
        <UBadge
          v-if="!node.isActive"
          color="neutral"
          variant="subtle"
          size="sm"
          class="ml-1"
        >
          Nonaktif
        </UBadge>
      </td>
      <td class="px-3 py-2">
        {{ ACCOUNT_TYPE_LABEL[node.accountType] }}
      </td>
      <td class="px-3 py-2 text-right text-muted">
        —
      </td>
    </tr>
    <template v-if="node.children.length && isExpanded(node)">
      <ChartOfAccountsTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :is-expanded="isExpanded"
        :is-visible="isVisible"
        :toggle="toggle"
      />
    </template>
  </template>
</template>
