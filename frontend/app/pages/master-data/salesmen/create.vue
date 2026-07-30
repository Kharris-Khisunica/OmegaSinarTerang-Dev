<script setup lang="ts">
definePageMeta({ title: 'Tambah Salesman' })

const schema = useSimpleMasterSchema('Nama Salesman')
</script>

<template>
  <CrudFormPage
    title="Tambah Salesman"
    endpoint="/salesmen"
    :schema="schema"
    back-to="/master-data/salesmen"
    :transform-out="simpleMasterTransformOut"
  />
</template>
