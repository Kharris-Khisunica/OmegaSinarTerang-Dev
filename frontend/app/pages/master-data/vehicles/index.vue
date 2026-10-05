<script setup lang="ts">
definePageMeta({ title: 'Kendaraan' })

const columns = useVehicleColumns()
const schema = useSimpleMasterSchema('Nama Kendaraan', 'mis. B 1234 XY - Truk Engkel')
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <MasterDataCrudPage
      title="Kendaraan"
      endpoint="/vehicles"
      list-to="/master-data/vehicles"
      :columns="columns"
      :schema="schema"
      :transform-out="simpleMasterTransformOut"
      search-placeholder="Cari kode atau nama kendaraan..."
      :default-sort="{ key: 'name', dir: 'asc' }"
      entity-label-singular="kendaraan ini"
    />
  </div>
</template>
