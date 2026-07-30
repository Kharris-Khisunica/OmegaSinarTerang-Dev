<script setup lang="ts">
definePageMeta({ title: 'Ubah Salesman' })

const route = useRoute()
const schema = useSimpleMasterSchema('Nama Salesman')
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Salesman"
    endpoint="/salesmen"
    :schema="schema"
    back-to="/master-data/salesmen"
    :transform-out="simpleMasterTransformOut"
  />
</template>
