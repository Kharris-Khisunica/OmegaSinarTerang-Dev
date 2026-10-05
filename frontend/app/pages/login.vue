<script setup lang="ts">
definePageMeta({ layout: false })

const { login, accessToken } = useAuth()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

// Kalau sudah punya token (mis. buka /login lewat back button), tidak perlu login ulang.
if (accessToken.value) {
  const returnUrl = typeof route.query.returnUrl === 'string' ? route.query.returnUrl : '/'
  await router.push(returnUrl)
}

async function onSubmit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await login(username.value, password.value)
    const returnUrl = typeof route.query.returnUrl === 'string' ? route.query.returnUrl : '/'
    await router.push(returnUrl)
  } catch (err) {
    error.value = getErrorMessage(err, 'Login gagal. Coba lagi.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="flex flex-col items-center gap-2 py-2">
          <h1 class="text-sm">
            Omega Sinar Terang
          </h1>
          <p class="text-sm text-muted">
            Masuk ke akun Anda
          </p>
        </div>
      </template>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
        />

        <UFormField label="Username">
          <UInput
            v-model="username"
            autofocus
            autocomplete="username"
            placeholder="Masukkan username"
            :disabled="submitting"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Masukkan password"
            :disabled="submitting"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          block
          :loading="submitting"
          :disabled="submitting || !username || !password"
        >
          Masuk
        </UButton>
      </form>
    </UCard>
  </div>
</template>
