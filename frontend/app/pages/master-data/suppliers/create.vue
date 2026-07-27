<script setup lang="ts">
definePageMeta({ title: 'Tambah Supplier' })

const schema = useSupplierSchema()
</script>

<template>
  <CrudFormPage
    title="Tambah Supplier"
    endpoint="/suppliers"
    :schema="schema"
    back-to="/master-data/suppliers"
    :transform-out="supplierTransformOut"
  />
</template>
