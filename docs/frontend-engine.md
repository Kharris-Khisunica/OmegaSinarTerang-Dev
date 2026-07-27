# Frontend Engine — `<DataTable>` & `<CrudFormPage>`

Dibuat Hari 3. Fondasi seluruh halaman list & form create/edit di 30 hari ke depan.
**Dilarang** menulis `<table>` atau `<form>` manual di halaman modul — tambah prop di
kedua komponen ini kalau ada kebutuhan baru.

Lokasi: `frontend/app/components/DataTable.vue`, `frontend/app/components/CrudFormPage.vue`
Tipe: `frontend/app/types/data-table.ts`, `frontend/app/types/crud-form.ts`

---

## `<DataTable>`

### Props

| Prop | Tipe | Default | Keterangan |
|---|---|---|---|
| `endpoint` | `string` | — | Path API, mis. `/products`. Diselesaikan lewat `useApi()`. |
| `columns` | `Column[]` | — | `{ key, label, align?, width?, format?, slot? }` |
| `searchable` | `boolean` | `true` | Tampilkan search box (debounce 300ms). |
| `searchPlaceholder` | `string` | `'Cari...'` | |
| `filters` | `FilterDef[]` | `[]` | `{ key, label, type: 'select'\|'date-range', options?, placeholder? }` |
| `rowActions` | `RowAction[]` | `[]` | `{ label, icon?, to?(row), onClick?(row), roles?, show?(row), color? }` |
| `createTo` | `string` | — | Tombol "Tambah" kanan atas. Kosongkan untuk sembunyikan. |
| `defaultSort` | `{ key, dir }` | — | Sort awal kalau URL belum punya `sortBy`. |

Semua kolom bisa di-sort dengan klik header (tidak perlu flag `sortable` per kolom).

### Perilaku

- **Server-side pagination.** Query dikirim: `page`, `limit`, `search`, `sortBy`, `sortDir`,
  plus setiap `filters[].key` (atau `${key}From`/`${key}To` untuk `date-range`).
- **Response yang diharapkan:** `{ data: T[], meta: { page, limit, total, totalPages } }`.
- **State di URL** (`?page=2&search=indomie&sortBy=code&sortDir=asc`) lewat `router.replace` —
  bertahan setelah refresh/bookmark.
- **Skeleton** saat loading, **empty state** ramah (`UEmpty`) kalau hasil kosong,
  **error state** dengan tombol "Coba lagi" kalau request gagal.
- **rowActions terfilter otomatis** oleh `roles` (dibandingkan ke role aktif dari
  `useAuthUser()`) dan oleh `show(row)` (kondisi per-baris, mis. sembunyikan
  "Aktifkan" kalau baris sudah aktif).
- Filter `select` yang sudah dipilih menampilkan tombol "×" untuk menghapus filter —
  **jangan** menambahkan opsi dengan `value: ''` untuk "Semua", karena primitive Reka UI
  di balik `USelect` menolak `SelectItem` dengan value string kosong (akan melempar error
  500 saat SSR). Sembunyikan/hapus filter, jangan pura-pura punya opsi "kosongkan".
- Expose method `reload()` lewat `defineExpose` — pakai `ref` di halaman pemanggil untuk
  memuat ulang data setelah aksi baris (mis. toggle aktif/nonaktif) tanpa reload halaman.

### Contoh minimal

```vue
<DataTable
  ref="table"
  endpoint="/products"
  :columns="columns"
  :filters="filters"
  :row-actions="rowActions"
  create-to="/master-data/products/create"
  :default-sort="{ key: 'name', dir: 'asc' }"
/>
```

---

## `<CrudFormPage>`

### Props

| Prop | Tipe | Keterangan |
|---|---|---|
| `title` | `string` | Judul halaman. |
| `endpoint` | `string` | Path API dasar, mis. `/products`. |
| `id` | `string \| number?` | Kalau diisi → mode edit (fetch `GET {endpoint}/{id}` dulu). |
| `schema` | `FieldDef[]` | `{ key, label, type, required?, options?, cols?, hint?, disabled?, placeholder?, showIf? }` |
| `backTo` | `string` | Path kembali setelah simpan/batal. |
| `transformIn` | `(data) => Record` | Opsional, mapping response server → form. |
| `transformOut` | `(form) => unknown` | Opsional, mapping form → payload request. |

`FieldDef.type` minimal: `text`, `number`, `currency`, `select`, `autocomplete`, `date`,
`textarea`, `switch`. `cols` = lebar grid 1–12 (grid 12 kolom), default 12 (baris penuh).

### Perilaku

- **Ctrl+S** menyimpan, **Esc** kembali ke `backTo` (konfirmasi `window.confirm` dulu
  kalau ada perubahan belum disimpan — dibandingkan lewat snapshot JSON form saat mount).
- **Auto-focus** ke field pertama saat halaman terbuka, dan lagi setelah
  "Simpan & Tambah Lagi" mereset form.
- **Validasi client** (required) dulu sebelum request. **Error server (400)** dipetakan
  per field: kalau body error punya `fieldErrors: Record<string,string>` dipakai langsung;
  kalau tidak, setiap string di `message[]` (format default `ValidationPipe` NestJS —
  class-validator, mis. `"name should not be empty"`) dicocokkan ke field yang key-nya jadi
  prefix pesan. Pesan yang tidak cocok field manapun tampil sebagai banner di atas form.
- **"Simpan"** dan **"Simpan & Tambah Lagi"** — yang kedua hanya muncul di mode *create*
  (disembunyikan saat edit), mereset form dan fokus balik ke field pertama setelah sukses.
- **Blokir double-submit** lewat flag `submitting`.
- Field `currency`/`number` pakai `UInputNumber` (format `Intl.NumberFormat` bawaan
  Nuxt UI) — bukan `useRupiah()` manual, supaya kursor tidak lompat saat mengetik.
  `useRupiah()` (di `composables/useRupiah.ts`) tetap satu-satunya composable untuk
  menampilkan angka uang **read-only** (kolom tabel, ringkasan total, dsb).
- Field `select`/`autocomplete` pakai `USelect`/`UInputMenu` dengan `valueKey="value"` —
  **wajib** diisi eksplisit untuk `UInputMenu` (defaultnya `undefined`, beda dari
  `USelect` yang defaultnya `'value'`), kalau tidak `modelValue` jadi objek penuh,
  bukan `field.value`-nya saja.
- `FieldDef.showIf?: (form) => boolean` (Hari 5) — sembunyikan field secara reaktif
  berdasar nilai field lain (mis. field `customerId` Warehouse hanya tampil kalau
  `warehouseType === 'CUSTOMER_CONSIGNMENT'`). Pakai `v-show` di dalam `CrudFormPage`
  (bukan `v-if`) supaya tidak ada remount/reset state saat field muncul lagi. Field yang
  sedang tersembunyi **dilewati** dari validasi `required` client-side — tetap tanggung
  jawab `transformOut` untuk membersihkan nilainya sebelum dikirim (jangan andalkan
  backend menolaknya, walau `whitelist:true` + DTO validation di backend tetap jadi
  pertahanan kedua).

---

## `useApi()` (`composables/useApi.ts`)

Satu-satunya jalur panggilan API di FE (aturan CLAUDE.md §6).

- Path yang diawali `/api/` → Nuxt server route lokal (dev mock / BFF), dipanggil
  same-origin tanpa prefix. Dipakai untuk mock sementara sebelum modul backend ada
  (lihat `frontend/server/api/warehouses/` — in-memory, hilang tiap restart dev server).
- Path lain (mis. `/products`) → backend NestJS lewat `runtimeConfig.public.apiBase`,
  disisipi header `Authorization: Bearer <accessToken>` dari `useAuth()`. Kalau backend
  membalas 401, dicoba `refresh()` sekali (in-flight refresh dibagi lewat variabel
  module-level supaya tidak ada beberapa `POST /auth/refresh` bersamaan / refresh-loop);
  kalau refresh juga gagal → `logout()` + redirect `/login?returnUrl=...`.
- `getErrorData()`, `getErrorStatus()`, `getErrorMessage()` — helper baca body error
  dari `FetchError` (ofetch) tanpa `any`, dipakai bareng oleh `DataTable` dan `CrudFormPage`.

## `useAuth()` (`composables/useAuth.ts`)

Composable auth utama (Hari 2 FE): state `user` (`useState`) + `accessToken`/`refreshToken`
(`useCookie`, `sameSite: 'strict'`) + `login()`/`logout()`/`refresh()`/`fetchMe()`. Panggil
`$fetch` langsung ke backend (bukan lewat `useApi()`) supaya tidak ada ketergantungan
melingkar dengan interceptor 401 di `useApi()`.

## `useAuthUser()` (`composables/useAuthUser.ts`)

Thin wrapper di atas `useAuth()` — `activeRole` sekarang `computed` read-only dari
`user.value.role`. Signature (`{ activeRole }`) dipertahankan dari versi placeholder
Hari 3 supaya `DataTable` tidak perlu berubah.

## Middleware (`app/middleware/`)

- `00.auth.global.ts` — global, jalan di semua route, lewat `useAuth().ensureSession()`:
  access token cookie kosong (umur pendek, 15 menit — sering sudah expired) tapi refresh
  token (1 hari) masih ada → coba refresh dulu, jangan langsung lempar ke login. Kalau
  token ada tapi `user` belum termuat (mis. setelah F5, `useState` server-side reset tapi
  cookie tetap ada) → panggil `GET /auth/me` dulu (retry sekali via refresh kalau gagal)
  sebelum lanjut, supaya role guard & topbar tidak sempat render kosong/"berkedip". Semua
  itu gagal → `logout()` + redirect `/login?returnUrl=...`.
- `01.roles.global.ts` — global juga (prefix angka memastikan urutan setelah `00.`), baca
  `to.meta.roles` (diisi lewat `definePageMeta({ roles: ['MASTER'] })` di halaman) dan
  redirect ke `/` kalau role user tidak termasuk.
- Tipe `roles` di page meta diaugment di `app/types/page-meta.d.ts` (`declare module
  'vue-router' { interface RouteMeta { roles?: Role[] } }`).

---

## Halaman percontohan

`frontend/app/pages/master-data/warehouses/` (list, create, edit) — membuktikan kedua
komponen cukup untuk modul nyata tanpa fork. Skema field dibagi lewat
`composables/useWarehouseSchema.ts` supaya halaman create & edit tidak duplikasi.
**Update Hari 5**: endpoint mock `frontend/server/api/warehouses/` (Hari 3, in-memory)
sudah dihapus dan diarahkan ke backend NestJS asli (`/warehouses`) — field schema juga
ditulis ulang total karena bentuk mock lama (`code`, `type`, `address`, `is_active`)
tidak cocok dengan entity backend sungguhan (`name`, `warehouseType`, `customerId`,
`isDefault`, `isActive`, tanpa `code`/`address`).

## `useExport()` (`composables/useExport.ts`) + `<ExportButton>`

Satu jalur export file (Excel/PDF) di FE, dipakai berulang oleh semua halaman laporan
mulai Hari 26. Lewat `useApi().getBlob()` (sama seperti `get/post/patch`, ikut auth +
retry 401 → refresh) — **jangan** `$fetch` manual terpisah untuk download, supaya tidak
ada jalur HTTP kedua yang lolos dari penanganan token.

- `useExport(endpoint, filters?)` → `{ exporting, error, exportFile(format, fileNamePrefix) }`.
  `filters` boleh fungsi `() => Record<string, unknown>` (dievaluasi ulang tiap export,
  bukan snapshot statis) — dipakai halaman laporan untuk mengirim filter tanggal/gudang/dsb
  sebagai query string bareng `?format=xlsx|pdf`.
- Nama file diambil dari `fileNamePrefix` + tanggal (dari `filters().date`/`filters().tanggal`
  kalau ada, atau tanggal hari ini) + ekstensi, mis. `laporan-stok-2026-08-05.xlsx` —
  **ditentukan di FE**, tidak bergantung pada header `Content-Disposition` server (backend
  boleh saja mengirim nama filenya sendiri, FE mengabaikannya).
- `<ExportButton endpoint="/reports/stock" file-name-prefix="laporan-stok" :filters="..." />`
  — render 2 tombol (Excel/PDF), disabled+loading saat `exporting`, toast error kalau gagal.
- Endpoint percontohan Hari 5 untuk uji unduh: `frontend/server/api/export-demo.get.ts`
  (dummy, balas file kecil ber-`Content-Type` sesuai `format` — **bukan** ExcelJS/PDFKit
  sungguhan; export generik ExcelJS/PDFKit backend adalah task BE Hari 5 terpisah, belum
  diverifikasi jalur/nama endpointnya dari sisi FE sesi ini). Ganti `endpoint` di pemanggil
  `<ExportButton>` ke path laporan backend asli begitu tersedia & kontraknya dikonfirmasi;
  hapus file dummy ini kalau sudah tidak dipakai lagi oleh halaman uji manapun.
