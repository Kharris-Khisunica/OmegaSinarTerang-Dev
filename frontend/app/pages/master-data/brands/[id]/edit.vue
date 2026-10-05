<script setup lang="ts">
definePageMeta({ title: 'Ubah Merek' })

const route = useRoute()
const columns = useBrandColumns()
const schema = useSimpleMasterSchema('Nama Merek', 'Bendera, Indomilk, dsb.')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Merek" />

    <MasterDataCrudPage
      title="Merek"
      endpoint="/brands"
      list-to="/master-data/brands"
      :columns="columns"
      :schema="schema"
      :transform-out="simpleMasterTransformOut"
      search-placeholder="Cari kode atau nama merek..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="merek ini"
      initial-open="ubah"
      :initial-edit-id="route.params.id as string"
    />
  </div>
</template>
