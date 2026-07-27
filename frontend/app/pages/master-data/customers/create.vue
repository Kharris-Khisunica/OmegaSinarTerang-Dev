<script setup lang="ts">
definePageMeta({ title: 'Tambah Customer' })

const schema = useCustomerSchema()
</script>

<template>
  <CrudFormPage
    title="Tambah Customer"
    endpoint="/customers"
    :schema="schema"
    back-to="/master-data/customers"
  />
</template>
