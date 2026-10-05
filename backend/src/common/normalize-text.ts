/**
 * Auto-capitalize satu tempat (asumsi A2, `docs/RENCANA_REVISI_TESTING_KLIEN.md`
 * §2B) — dipanggil eksplisit dari tiap service master data, BUKAN lewat
 * `@BeforeInsert` di entity, supaya perilakunya terlihat jelas dari DTO/test
 * yang membaca service, bukan tersembunyi di lapisan ORM.
 *
 * Hanya untuk field NAMA & ALAMAT. JANGAN dipakai untuk email, kode/`code`,
 * NPWP, nomor telepon, atau field keterangan/catatan bebas.
 */
export function toUpperTrim(value: string): string;
export function toUpperTrim(value: string | null): string | null;
export function toUpperTrim(
  value: string | null | undefined,
): string | null | undefined;
export function toUpperTrim(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  return value.trim().toUpperCase();
}
