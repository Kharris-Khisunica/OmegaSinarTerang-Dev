<script setup lang="ts">
definePageMeta({ title: 'Tambah Merek' })

const schema = useSimpleMasterSchema('Nama Merek', 'Bendera, Indomilk, dsb.')
</script>

<template>
  <CrudFormPage
    title="Tambah Merek"
    endpoint="/brands"
    :schema="schema"
    back-to="/master-data/brands"
    :transform-out="simpleMasterTransformOut"
  />
</template>
