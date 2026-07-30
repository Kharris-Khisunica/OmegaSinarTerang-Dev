interface RequestOptions {
  query?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
  responseType?: 'json' | 'blob'
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

// Module-level (bukan useState) sengaja: satu in-flight refresh dibagi oleh semua
// request 401 yang datang bersamaan, supaya tidak memicu banyak POST /auth/refresh
// sekaligus atau refresh-loop kalau refresh sendiri gagal.
let refreshPromise: Promise<boolean> | null = null

/**
 * Satu-satunya jalur panggilan API di FE.
 * - Path yang diawali "/api/" dianggap Nuxt server route lokal (dev mock, BFF) dan
 *   dipanggil apa adanya (same-origin, tanpa prefix, tanpa header auth).
 * - Path lain (mis. "/products") dipanggil ke backend NestJS lewat runtimeConfig.public.apiBase,
 *   disisipi header Authorization dari useAuth(). Kalau backend membalas 401, dicoba
 *   refresh token sekali; kalau refresh juga gagal, logout + redirect ke /login.
 */
export function useApi() {
  const config = useRuntimeConfig()
  const { accessToken, refresh, logout } = useAuth()

  function resolve(path: string) {
    return path.startsWith('/api/') ? path : `${config.public.apiBase}${path}`
  }

  async function request<T>(
    path: string,
    method: HttpMethod,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<T> {
    const isBackend = !path.startsWith('/api/')
    const headers: Record<string, string> = { ...options.headers }
    if (isBackend && accessToken.value) {
      headers.Authorization = `Bearer ${accessToken.value}`
    }

    try {
      return (await $fetch<T>(resolve(path), {
        method,
        query: options.query,
        body: options.body as Record<string, unknown> | undefined,
        headers,
        responseType: options.responseType ?? 'json'
      })) as T
    } catch (err) {
      if (isBackend && !isRetry && getErrorStatus(err) === 401) {
        if (!refreshPromise) {
          refreshPromise = refresh().finally(() => {
            refreshPromise = null
          })
        }
        const refreshed = await refreshPromise
        if (refreshed) {
          return request<T>(path, method, options, true)
        }
        await logout()
        const returnUrl = useRoute().fullPath
        await navigateTo(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      }
      throw err
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>, headers?: Record<string, string>) =>
      request<T>(path, 'GET', { query, headers }),
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>(path, 'POST', { body, headers }),
    patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>(path, 'PATCH', { body, headers }),
    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      request<T>(path, 'PUT', { body, headers }),
    delete: <T>(path: string, headers?: Record<string, string>) => request<T>(path, 'DELETE', { headers }),
    /** GET dengan response biner (download file) — tetap lewat auth + retry 401 yang sama. */
    getBlob: (path: string, query?: Record<string, unknown>) =>
      request<Blob>(path, 'GET', { query, responseType: 'blob' })
  }
}

/** Ambil body JSON error dari FetchError (ofetch) tanpa bergantung pada `any`. */
export function getErrorData(err: unknown): Record<string, unknown> | undefined {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: unknown }).data
    if (data && typeof data === 'object') return data as Record<string, unknown>
  }
  return undefined
}

export function getErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: unknown }).status
    if (typeof status === 'number') return status
  }
  return undefined
}

export function getErrorMessage(err: unknown, fallback: string): string {
  const data = getErrorData(err)
  const msg = data?.message
  if (typeof msg === 'string') return msg
  if (Array.isArray(msg)) return msg.join(' ')
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}
