<script setup lang="ts">
definePageMeta({ title: 'Ubah Gudang' })

const route = useRoute()
const schema = useWarehouseSchema()
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Gudang"
    endpoint="/warehouses"
    :schema="schema"
    back-to="/master-data/warehouses"
    :transform-out="warehouseTransformOut"
  />
</template>
