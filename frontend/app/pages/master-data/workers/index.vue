<script setup lang="ts">
definePageMeta({ title: 'Pekerja' })

const columns = useWorkerColumns()
const schema = useSimpleMasterSchema('Nama Pekerja', 'mis. Mang Icung')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <MasterDataCrudPage
      title="Pekerja"
      endpoint="/workers"
      list-to="/master-data/workers"
      :columns="columns"
      :schema="schema"
      :transform-out="simpleMasterTransformOut"
      search-placeholder="Cari kode atau nama pekerja..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="pekerja ini"
    />
  </div>
</template>
