import { DataSource } from 'typeorm';

/**
 * Kode singkat dari sequence Postgres yang TIDAK reset (beda pola dari
 * `document_counters` yang reset bulanan, CLAUDE.md §2 — ini murni kode
 * referensi master data kecil, bukan nomor dokumen). Supplier sudah pakai
 * pola ini sejak Hari 4 (`supplier_code_seq` inline di service-nya);
 * diekstrak jadi helper bersama saat Brand/Unit/Salesman menyusul Hari 10
 * supaya tidak triplikasi query yang sama tiga kali.
 *
 * `sequenceName` WAJIB literal yang dikontrol kode kita sendiri (bukan dari
 * input user) — diselipkan langsung ke SQL.
 */
export async function generateSequenceCode(
  dataSource: DataSource,
  sequenceName: string,
  prefix: string,
  padLength = 3,
): Promise<string> {
  const rows: { nextval: string }[] = await dataSource.query(
    `SELECT nextval('${sequenceName}') AS nextval`,
  );
  const sequenceValue = Number(rows[0].nextval);
  return `${prefix}-${String(sequenceValue).padStart(padLength, '0')}`;
}
