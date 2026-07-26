<script setup lang="ts">
definePageMeta({ title: 'Tambah Gudang' })

const schema = useWarehouseSchema()
</script>

<template>
  <CrudFormPage
    title="Tambah Gudang"
    endpoint="/api/warehouses"
    :schema="schema"
    back-to="/master-data/warehouses"
  />
</template>
