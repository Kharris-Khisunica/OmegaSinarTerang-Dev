import type { Role } from '~/types/auth'

/**
 * Thin wrapper di atas useAuth() — signature ({ activeRole }) dipertahankan
 * dari versi placeholder Hari 3 supaya DataTable dkk tidak perlu berubah.
 * activeRole sekarang computed read-only dari user login sungguhan.
 */
export function useAuthUser() {
  const { user } = useAuth()
  const activeRole = computed<Role>(() => user.value?.role ?? 'OPERATOR')
  return { activeRole }
}
