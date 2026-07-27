<script setup lang="ts">
definePageMeta({ title: 'Ubah Supplier' })

const route = useRoute()
const schema = useSupplierSchema()
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Supplier"
    endpoint="/suppliers"
    :schema="schema"
    back-to="/master-data/suppliers"
    :transform-out="supplierTransformOut"
  />
</template>
