<script setup lang="ts">
definePageMeta({ title: 'Tambah Satuan' })

const schema = useSimpleMasterSchema('Nama Satuan', 'DUS, SACHET, RENCENG, dsb.')
</script>

<template>
  <CrudFormPage
    title="Tambah Satuan"
    endpoint="/units"
    :schema="schema"
    back-to="/master-data/units"
    :transform-out="simpleMasterTransformOut"
  />
</template>
