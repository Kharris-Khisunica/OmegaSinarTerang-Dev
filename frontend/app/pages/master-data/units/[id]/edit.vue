<script setup lang="ts">
definePageMeta({ title: 'Ubah Satuan' })

const route = useRoute()
const schema = useSimpleMasterSchema('Nama Satuan', 'DUS, SACHET, RENCENG, dsb.')
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Satuan"
    endpoint="/units"
    :schema="schema"
    back-to="/master-data/units"
    :transform-out="simpleMasterTransformOut"
  />
</template>
