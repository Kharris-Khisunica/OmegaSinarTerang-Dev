import type { Role } from './auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Role yang boleh mengakses halaman ini. Kosong/undefined = semua role login. */
    roles?: Role[]
  }
}

export {}
