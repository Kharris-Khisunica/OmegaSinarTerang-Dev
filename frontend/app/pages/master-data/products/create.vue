<script setup lang="ts">
definePageMeta({ title: 'Tambah Produk' })

const schema = useProductSchema()
</script>

<template>
  <CrudFormPage
    title="Tambah Produk"
    endpoint="/products"
    :schema="schema"
    back-to="/master-data/products"
    :transform-out="productTransformOut"
  />
</template>
