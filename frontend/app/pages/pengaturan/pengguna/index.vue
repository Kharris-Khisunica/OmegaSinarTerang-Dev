<script setup lang="ts">
// Manajemen user & reset password (need_fixing.md #24) — MASTER-only, pola
// Pengaturan (CLAUDE.md §5). "Hapus"/"Nonaktifkan" bawaan MasterDataCrudPage
// = menonaktifkan user (tidak ada hard-delete, §2.1); backend menolak
// menonaktifkan/menurunkan akun sendiri dan MASTER aktif terakhir.
import type { Column, RowAction } from '~/types/data-table'
import type { FieldDef } from '~/types/crud-form'

definePageMeta({ title: 'Pengguna', roles: ['MASTER'] })

interface UserRow extends Record<string, unknown> {
  id: string
  username: string
  fullName: string
  role: 'MASTER' | 'SUPERVISOR' | 'OPERATOR'
  isActive: boolean
}

const api = useApi()
const toast = useToast()

const ROLE_LABEL: Record<string, string> = {
  MASTER: 'Master',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operator'
}

const columns: Column<UserRow>[] = [
  { key: 'username', label: 'Username', mono: true },
  { key: 'fullName', label: 'Nama' },
  { key: 'role', label: 'Role', format: v => ROLE_LABEL[v as string] ?? String(v) },
  { key: 'isActive', label: 'Status', align: 'center', format: v => (v ? 'Aktif' : 'Nonaktif') }
]

// `_existing` (tersembunyi) membedakan Entri vs Ubah di dalam schema: password
// hanya diminta saat Entri, username dikunci saat Ubah (tercatat di audit &
// baris CETAK nota). Password diganti lewat aksi "Reset Password".
const schema: FieldDef[] = [
  { key: '_existing', label: '', type: 'switch', showIf: () => false },
  {
    key: 'username',
    label: 'Username',
    type: 'text',
    required: true,
    cols: 6,
    placeholder: 'huruf kecil, mis. kasir1',
    disabled: form => !!form._existing,
    hint: form => (form._existing ? 'Username tidak bisa diubah.' : '3–32 karakter: huruf kecil, angka, titik, garis bawah, minus.')
  },
  { key: 'fullName', label: 'Nama Lengkap', type: 'text', required: true, cols: 6 },
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    required: true,
    cols: 6,
    options: [
      { label: 'Master', value: 'MASTER' },
      { label: 'Supervisor', value: 'SUPERVISOR' },
      { label: 'Operator', value: 'OPERATOR' }
    ]
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    cols: 6,
    hint: 'Minimal 6 karakter.',
    showIf: form => !form._existing
  }
]

function transformIn(data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, _existing: true }
}
function transformOut(form: Record<string, unknown>): unknown {
  if (form._existing) {
    return { fullName: form.fullName, role: form.role }
  }
  return {
    username: String(form.username ?? '').trim().toLowerCase(),
    fullName: form.fullName,
    role: form.role,
    password: form.password
  }
}

// ---- Reset password -----------------------------------------------------
const resetOpen = ref(false)
const resetTarget = ref<UserRow | null>(null)
const resetPassword = ref('')
const resetConfirm = ref('')
const resetError = ref('')
const resetting = ref(false)

function openReset(row: UserRow) {
  resetTarget.value = row
  resetPassword.value = ''
  resetConfirm.value = ''
  resetError.value = ''
  resetOpen.value = true
}

async function submitReset() {
  if (!resetTarget.value) return
  if (resetPassword.value.length < 6) {
    resetError.value = 'Password minimal 6 karakter.'
    return
  }
  if (resetPassword.value !== resetConfirm.value) {
    resetError.value = 'Konfirmasi password tidak sama.'
    return
  }
  resetting.value = true
  resetError.value = ''
  try {
    await api.post(`/users/${resetTarget.value.id}/reset-password`, { password: resetPassword.value })
    toast.add({ title: `Password ${resetTarget.value.username} direset`, description: 'Sesi login user itu diakhiri.', color: 'success' })
    resetOpen.value = false
  } catch (err) {
    resetError.value = getErrorMessage(err, 'Gagal mereset password.')
  } finally {
    resetting.value = false
    resetPassword.value = ''
    resetConfirm.value = ''
  }
}

const extraRowActions: RowAction<UserRow>[] = [
  { label: 'Reset Password', icon: 'i-lucide-key-round', roles: ['MASTER'], onClick: row => openReset(row) }
]
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <PageHeader />

    <MasterDataCrudPage
      title="Pengguna"
      endpoint="/users"
      list-to="/pengaturan/pengguna"
      :columns="columns"
      :schema="schema"
      :transform-in="transformIn"
      :transform-out="transformOut"
      :extra-row-actions="extraRowActions"
      search-placeholder="Cari username atau nama..."
      :default-sort="{ key: 'username', dir: 'asc' }"
      entity-label-singular="pengguna ini (dinonaktifkan, tidak bisa login)"
    />

    <UModal
      v-model:open="resetOpen"
      title="Reset Password"
      :description="resetTarget ? `User: ${resetTarget.username} — sesi login-nya akan diakhiri.` : undefined"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            v-if="resetError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-triangle"
            :description="resetError"
          />
          <UFormField
            label="Password Baru"
            required
          >
            <UInput
              v-model="resetPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Ulangi Password Baru"
            required
          >
            <UInput
              v-model="resetConfirm"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="resetOpen = false"
          >
            Batal
          </UButton>
          <UButton
            :loading="resetting"
            :disabled="resetting"
            @click="submitReset"
          >
            Reset Password
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
