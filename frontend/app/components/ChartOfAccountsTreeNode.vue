<script setup lang="ts">
import type { AccountNode } from '~/composables/useChartOfAccountsTree'
import { ACCOUNT_SUBTYPE_LABEL, ACCOUNT_TYPE_LABEL, NORMAL_BALANCE_LABEL } from '~/composables/useChartOfAccountsTree'

const props = defineProps<{
  node: AccountNode
  depth: number
  isExpanded: (node: AccountNode) => boolean
  isVisible: (node: AccountNode) => boolean
  toggle: (id: string) => void
  selectedId?: string | null
  onSelect?: (node: AccountNode) => void
}>()
</script>

<template>
  <template v-if="isVisible(node)">
    <tr
      class="border-b border-default last:border-0 hover:bg-elevated/30 cursor-pointer"
      :class="[
        !node.isPostable ? 'bg-elevated/40 font-semibold' : undefined,
        selectedId === node.id ? 'outline outline-2 -outline-offset-2 outline-primary' : undefined
      ]"
      :title="!node.isPostable ? 'Akun header (Grup/Kategori) — tidak bisa dijurnal, tidak muncul di picker akun' : undefined"
      @click="props.onSelect?.(node)"
    >
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
          <UIcon
            v-if="!node.isPostable"
            name="i-lucide-lock"
            class="size-3.5 text-muted shrink-0"
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
      <td class="px-3 py-2">
        {{ ACCOUNT_SUBTYPE_LABEL[node.accountSubtype] }}
      </td>
      <td class="px-3 py-2">
        {{ NORMAL_BALANCE_LABEL[node.normalBalance] }}
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
        :selected-id="selectedId"
        :on-select="onSelect"
      />
    </template>
  </template>
</template>
