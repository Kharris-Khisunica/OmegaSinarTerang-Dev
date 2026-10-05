<script setup lang="ts">
definePageMeta({ title: 'Ubah Salesman' })

const route = useRoute()
const columns = useSalesmanColumns()
const schema = useSimpleMasterSchema('Nama Salesman')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader title="Salesman" />

    <MasterDataCrudPage
      title="Salesman"
      endpoint="/salesmen"
      list-to="/master-data/salesmen"
      :columns="columns"
      :schema="schema"
      :transform-out="simpleMasterTransformOut"
      search-placeholder="Cari kode atau nama salesman..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="salesman ini"
      initial-open="ubah"
      :initial-edit-id="route.params.id as string"
    />
  </div>
</template>
