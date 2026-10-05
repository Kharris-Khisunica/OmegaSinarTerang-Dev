import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  DOCUMENT_PREFIXES,
  DocumentType,
} from '../../core/document-counter/document-counter.service';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';
import {
  DOCUMENT_CONTINUITY_TYPES,
  DocumentContinuityType,
  assertDocumentContinuityType,
} from './document-continuity-registry';

interface RawContinuityRow {
  document_number: string;
  document_date: string;
  status: string;
  void_reason_code: string | null;
  void_reason_note: string | null;
  party: string | null;
  amount: string | null;
  seq: number;
}

export interface DocumentContinuityRow {
  seq: number;
  documentNumber: string;
  documentDate: string | null;
  status: string;
  party: string | null;
  amount: string | null;
  voidReasonCode: string | null;
  voidReasonNote: string | null;
  isGap: boolean;
  [key: string]: unknown;
}

export interface DocumentContinuitySummary {
  type: DocumentContinuityType;
  period: string;
  year: number;
  month: number;
  lastNumber: number;
  gapCount: number;
}

const COLUMNS: ExportColumn[] = [
  { key: 'seq', label: 'No. Urut', width: 10, format: 'number' },
  { key: 'documentNumber', label: 'Nomor Dokumen', width: 24, format: 'text' },
  { key: 'documentDate', label: 'Tanggal', width: 14, format: 'date' },
  { key: 'status', label: 'Status', width: 12, format: 'text' },
  { key: 'party', label: 'Pihak', width: 26, format: 'text' },
  { key: 'amount', label: 'Nominal', width: 18, format: 'currency' },
  {
    key: 'voidReasonCode',
    label: 'Kode Alasan VOID',
    width: 20,
    format: 'text',
  },
  {
    key: 'voidReasonNote',
    label: 'Catatan Alasan VOID',
    width: 32,
    format: 'text',
  },
];

/**
 * Laporan Kontinuitas Nomor Dokumen (CLAUDE.md §2.4, Hari 28). Menampilkan
 * SETIAP nomor dari 0001 sampai `document_counters.last_number` untuk satu
 * jenis dokumen + periode, dengan status POSTED/VOIDED untuk yang ada barisnya
 * dan MISSING (lubang, "hilang tanpa penjelasan") untuk yang tidak.
 *
 * Karena `document_counters` adalah tabel di dalam transaction pemanggil
 * (CLAUDE.md §2.4), rollback transaksi gagal mengembalikan nomor sebelum
 * sempat terpakai — desainnya memang tidak boleh pernah bolong. Laporan ini
 * BUKAN untuk mengasumsikan itu benar, tapi untuk MEMBUKTIKANNYA lewat
 * pembacaan langsung dari tabel dokumen, independen dari asumsi itu.
 *
 * Pencocokan nomor dokumen -> nomor urut dilakukan dengan mem-parse 4 digit
 * terakhir nomor dokumen (`RIGHT(number, 4)`) dan membandingkan 4 digit
 * periode sebelum itu (`RIGHT(number, 8)` dua digit awal) — bukan dengan
 * merekonstruksi ulang seluruh nomor dari store_code saat ini, supaya
 * laporan tetap benar meski store_code pernah berubah historisnya.
 * store_code SAAT INI hanya dipakai untuk menampilkan nomor yang HILANG
 * (baris MISSING) sebagai ilustrasi, bukan untuk pencocokan.
 */
@Injectable()
export class DocumentContinuityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getContinuity(
    type: DocumentContinuityType,
    year: number,
    month: number,
  ): Promise<
    ExportableResponse<DocumentContinuityRow> & {
      summary: DocumentContinuitySummary;
    }
  > {
    assertDocumentContinuityType(type);
    const config = DOCUMENT_CONTINUITY_TYPES[type]!;
    const manager = this.dataSource.manager;
    const period = formatPeriod(year, month);

    const counterRows: { last_number: number }[] = await manager.query(
      `SELECT last_number FROM document_counters WHERE doc_type = $1 AND period = $2`,
      [type, period],
    );
    const lastNumber = Number(counterRows[0]?.last_number ?? 0);

    const rows: DocumentContinuityRow[] = [];
    let gapCount = 0;

    if (lastNumber > 0) {
      const existingRows: RawContinuityRow[] = await manager.query(
        `SELECT
           t.${config.numberColumn} AS document_number,
           t.${config.dateColumn} AS document_date,
           ${config.statusExpression} AS status,
           t.void_reason_code AS void_reason_code,
           t.void_reason_note AS void_reason_note,
           ${config.partyExpression} AS party,
           ${config.amountExpression} AS amount,
           RIGHT(t.${config.numberColumn}, 4)::int AS seq
         FROM ${config.table} t
         WHERE RIGHT(t.${config.numberColumn}, 8) LIKE $1
         ORDER BY seq ASC`,
        [`${period}____`],
      );
      const bySeq = new Map(existingRows.map((r) => [Number(r.seq), r]));

      const prefix = DOCUMENT_PREFIXES[type];
      let storeCode: string | null = null;

      for (let seq = 1; seq <= lastNumber; seq += 1) {
        const existing = bySeq.get(seq);
        if (existing) {
          rows.push({
            seq,
            documentNumber: existing.document_number,
            documentDate: existing.document_date,
            status: existing.status,
            party: existing.party,
            amount: existing.amount,
            voidReasonCode: existing.void_reason_code,
            voidReasonNote: existing.void_reason_note,
            isGap: false,
          });
        } else {
          gapCount += 1;
          storeCode ??= await this.getStoreCode(manager);
          rows.push({
            seq,
            documentNumber: `${prefix}/${storeCode}-${period}${String(seq).padStart(4, '0')}`,
            documentDate: null,
            status: 'MISSING',
            party: null,
            amount: null,
            voidReasonCode: null,
            voidReasonNote:
              'Nomor ini hilang tanpa penjelasan — tidak ada baris dokumen untuk nomor ini.',
            isGap: true,
          });
        }
      }
    }

    const monthLabel = String(month).padStart(2, '0');

    return {
      rows,
      columns: COLUMNS,
      meta: {
        title: `Laporan Kontinuitas Nomor Dokumen — ${config.label}`,
        subtitle: `Periode ${monthLabel}/${year}`,
        filters: {
          jenisDokumen: config.label,
          periode: `${monthLabel}/${year}`,
        },
      },
      summary: { type, period, year, month, lastNumber, gapCount },
    };
  }

  private async getStoreCode(manager: EntityManager): Promise<string> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'store_code'`,
    );
    return rows[0]?.value ?? '?';
  }
}

function formatPeriod(year: number, month: number): string {
  const yy = String(year % 100).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${yy}${mm}`;
}
