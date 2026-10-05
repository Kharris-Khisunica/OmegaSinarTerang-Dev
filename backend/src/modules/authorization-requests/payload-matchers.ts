import { ActionType } from './action-type.enum';

type Payload = Record<string, unknown>;
type PayloadMatcher = (approved: Payload, current: Payload) => boolean;

// Deep-equal TIDAK BOLEH lewat JSON.stringify naif — `payload` disimpan
// sebagai jsonb (bukan json), dan Postgres jsonb MENORMALISASI ulang urutan
// key objek (diverifikasi: urut panjang-lalu-leksikografis, BUKAN urutan
// insersi). `approved` (dibaca balik dari DB) dan `current` (dibangun segar
// di JS, urutan insersi) punya urutan key berbeda untuk objek ber-3+-key
// meski isinya identik — JSON.stringify akan salah bilang "beda" (Hari 21,
// ketahuan dari SELL_BELOW_COST yang punya 6 key per baris `lines[]`;
// BS_TO_STORE lolos hanya karena kebetulan 2 key-nya `productId`/
// `qtyBaseUnit` sudah sesuai urutan normalisasi). Rekursif, tidak peduli
// urutan key objek maupun objek di dalam array.
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    return a.every((item, i) => sameValue(item, b[i]));
  }
  if (
    typeof a === 'object' &&
    a !== null &&
    typeof b === 'object' &&
    b !== null
  ) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    return aKeys.every(
      (key, i) => key === bKeys[i] && sameValue(aObj[key], bObj[key]),
    );
  }
  return false;
}

function exactFields(fields: string[]): PayloadMatcher {
  return (approved, current) =>
    fields.every((field) => sameValue(approved[field], current[field]));
}

/**
 * Satu comparator per actionType (CLAUDE.md §19: "Tentukan pencocokan per
 * actionType, jangan deep-equal buta"). Tiap aksi menentukan sendiri field
 * mana yang SECARA KEAMANAN penting untuk dicocokkan (mis. nominal + akun
 * untuk pengeluaran kas) — supaya field lain yang boleh berbeda antar
 * percobaan tidak ikut menggagalkan approval yang sah, dan sebaliknya field
 * yang penting tidak lolos kalau diam-diam diubah antara saat disetujui dan
 * saat dieksekusi (mis. approval Rp 1 juta dipakai mengeksekusi Rp 100 juta).
 *
 * actionType yang BELUM terdaftar di sini sengaja TIDAK dikasih fallback —
 * lihat matchesApprovedPayload(). Pemanggil pertama actionType itu (Hari
 * 13/15/17/21) WAJIB menambah entry di sini sesuai kontrak payload sungguhan
 * yang dipakai hari itu. Fail closed dipilih supaya lupa mendaftarkan
 * comparator ketahuan langsung (error keras), bukan diam-diam meloloskan
 * payload apa pun.
 */
const PAYLOAD_MATCHERS: Partial<Record<string, PayloadMatcher>> = {
  // Aksi step-up sementara (Hari 5, dihapus begitu Hari 12/19+ punya aksi
  // step-up sungguhan) — payload-nya cuma jejak request generik dari guard,
  // tidak ada isi sensitif yang perlu dicocokkan.
  TEST_STEP_UP_ACTION: () => true,

  // CLAUDE.md §5: "Pengeluaran kas besar butuh approval ... dipakai
  // StepUpService.requireApproval()". Kontrak payload minimal: akun kas yang
  // dipakai + nominal — dua-duanya wajib identik dengan yang disetujui.
  [ActionType.CASH_OUTFLOW]: exactFields(['accountId', 'amount']),

  // Hari 13: mutasi BAD_STOCK -> STORE (barang jadi bisa dijual lagi lagi,
  // CLAUDE.md §3 "Bad stock"). Satu approval per DOKUMEN mutasi (bisa
  // multi-baris), bukan per baris — payload minimal: gudang asal+tujuan
  // (memastikan arah mutasinya tidak diam-diam ditukar) + seluruh baris
  // (qty per produk) persis sama dengan yang disetujui.
  [ActionType.BS_TO_STORE]: exactFields([
    'fromWarehouseId',
    'toWarehouseId',
    'lines',
  ]),

  // Hari 15: kunci cetak generik (CLAUDE.md §2.16). Payload minimal:
  // sourceType+sourceId (dokumen MANA — token faktur A tidak boleh dipakai
  // untuk faktur B) + intent (NIAT apa — token EDIT tidak boleh dipakai
  // untuk VOID). Ketiganya WAJIB identik dengan yang disetujui; field lain
  // (reason, dll.) sengaja tidak ikut dicocokkan karena bukan bagian yang
  // secara keamanan penting.
  [ActionType.UNLOCK_PRINT]: exactFields(['sourceType', 'sourceId', 'intent']),

  // Hari 21: batas jual di bawah harga pokok (CLAUDE.md §2.17). Satu
  // approval per FAKTUR (bisa multi-baris pelanggar), bukan per baris —
  // payload minimal: pelanggan+tanggal faktur (memastikan approval ini
  // tidak dipakai untuk faktur lain) + seluruh baris pelanggar (produk,
  // satuan, qty, harga, diskon) persis sama dengan yang disetujui.
  [ActionType.SELL_BELOW_COST]: exactFields([
    'customerId',
    'invoiceDate',
    'lines',
  ]),

  // Hari 22: VOID oleh Operator wajib step-up (CLAUDE.md §2.13) — pemakai
  // pertama, lewat SalesInvoicesService.voidInvoice(). Gate ini berbasis ROLE
  // (OPERATOR saja), independen dari kunci cetak (UNLOCK_PRINT, berbasis
  // print_status dokumen) — keduanya bisa berlaku sekaligus untuk faktur yang
  // sudah dicetak, makanya masing-masing punya authorization_request sendiri.
  // Payload minimal: sourceType+sourceId (dokumen MANA yang boleh di-VOID
  // dengan token ini) — reasonCode/reasonNote sengaja TIDAK dicocokkan, sama
  // seperti UNLOCK_PRINT (bukan bagian yang secara keamanan penting).
  [ActionType.VOID_DOCUMENT]: exactFields(['sourceType', 'sourceId']),
};

export function matchesApprovedPayload(
  actionType: string,
  approvedPayload: Payload,
  currentPayload: Payload,
): boolean {
  const matcher = PAYLOAD_MATCHERS[actionType];
  if (!matcher) {
    throw new Error(
      `Belum ada aturan pencocokan payload (payload matcher) untuk actionType "${actionType}". ` +
        'Tambahkan entry di payload-matchers.ts sebelum actionType ini dipakai lewat StepUpService/StepUpGuard.',
    );
  }
  return matcher(approvedPayload, currentPayload);
}
