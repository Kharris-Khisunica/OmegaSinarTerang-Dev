import type { AuthTokens, AuthUser, LoginResponse } from '~/types/auth'

const ACCESS_TOKEN_MAX_AGE = 15 * 60
const REFRESH_TOKEN_MAX_AGE = 24 * 60 * 60

/**
 * Auth composable tunggal: state user + token, login/logout/refresh.
 * Token disimpan lewat useCookie (sameSite: 'strict') — bukan httpOnly beneran
 * (JS di sisi client tetap perlu membacanya untuk menyisipkan header Authorization),
 * tapi tidak bisa dibaca cross-site berkat sameSite: 'strict'.
 * Panggil $fetch langsung (bukan useApi()) di sini supaya tidak ada ketergantungan
 * melingkar dengan interceptor 401->refresh di useApi().
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const accessToken = useCookie<string | null>('access_token', {
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
    default: () => null
  })
  const refreshToken = useCookie<string | null>('refresh_token', {
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    default: () => null
  })

  const isAuthenticated = computed(() => !!accessToken.value)

  function apiBase() {
    return useRuntimeConfig().public.apiBase
  }

  function setTokens(tokens: AuthTokens) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
  }

  function clear() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
  }

  async function login(username: string, password: string) {
    const res = await $fetch<LoginResponse>(`${apiBase()}/auth/login`, {
      method: 'POST',
      body: { username, password }
    })
    setTokens(res)
    user.value = res.user
  }

  async function logout() {
    const token = accessToken.value
    clear()
    if (!token) return
    try {
      await $fetch(`${apiBase()}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      // best-effort: token sudah dihapus di sisi client meski request gagal
    }
  }

  /** Tukar refresh token ke pasangan token baru. Return false kalau gagal (sesi habis). */
  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false
    try {
      const res = await $fetch<AuthTokens>(`${apiBase()}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: refreshToken.value }
      })
      setTokens(res)
      return true
    } catch {
      clear()
      return false
    }
  }

  async function fetchMe(): Promise<boolean> {
    if (!accessToken.value) return false
    try {
      user.value = await $fetch<AuthUser>(`${apiBase()}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` }
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Dipakai middleware sebelum render halaman terproteksi. Access token cookie
   * berumur pendek (15 menit) jadi sering sudah kedaluwarsa (hilang dari cookie)
   * padahal refresh token (1 hari) masih hidup — coba refresh dulu sebelum
   * dianggap logout, supaya operator tidak ke-lempar ke /login tiap 15 menit.
   */
  async function ensureSession(): Promise<boolean> {
    if (!accessToken.value && !(await refresh())) return false
    if (user.value) return true
    if (await fetchMe()) return true
    // access token mungkin basi (mis. jam server/klien beda) — coba refresh sekali lagi
    return (await refresh()) && (await fetchMe())
  }

  return { user, accessToken, refreshToken, isAuthenticated, login, logout, refresh, fetchMe, ensureSession }
}
