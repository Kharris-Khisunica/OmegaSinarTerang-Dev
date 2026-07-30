<script setup lang="ts">
definePageMeta({ title: 'Ubah Merek' })

const route = useRoute()
const schema = useSimpleMasterSchema('Nama Merek', 'Bendera, Indomilk, dsb.')
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Merek"
    endpoint="/brands"
    :schema="schema"
    back-to="/master-data/brands"
    :transform-out="simpleMasterTransformOut"
  />
</template>
