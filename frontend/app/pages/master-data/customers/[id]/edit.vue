<script setup lang="ts">
definePageMeta({ title: 'Ubah Customer' })

const route = useRoute()
const schema = useCustomerSchema()
</script>

<template>
  <CrudFormPage
    :id="route.params.id as string"
    title="Ubah Customer"
    endpoint="/customers"
    :schema="schema"
    back-to="/master-data/customers"
  />
</template>
