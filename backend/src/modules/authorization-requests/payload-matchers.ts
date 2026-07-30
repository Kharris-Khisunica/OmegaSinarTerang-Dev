import { ActionType } from './action-type.enum';

type Payload = Record<string, unknown>;
type PayloadMatcher = (approved: Payload, current: Payload) => boolean;

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
