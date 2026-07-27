<script setup lang="ts">
definePageMeta({ title: 'Ubah Produk' })

const route = useRoute()
const schema = useProductSchema()
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Produk"
    endpoint="/products"
    :schema="schema"
    back-to="/master-data/products"
    :transform-in="productTransformIn"
    :transform-out="productTransformOut"
  />
</template>
