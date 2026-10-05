import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';
import { SalesReportGroupBy } from './dto/sales-report-query.dto';
import { toIsoDate } from './aging-bucket.util';

export interface SalesReportRow extends Record<string, unknown> {
  groupCode: string | null;
  groupName: string;
  invoiceCount: number;
  totalAmount: number;
  invoiceId?: string;
  isGrandTotal?: boolean;
  salesmanName?: string;
  invoiceDate?: string;
}

const GROUPED_COLUMNS = (partyLabel: string): ExportColumn[] => [
  { key: 'groupCode', label: 'Kode', width: 14, format: 'text' },
  { key: 'groupName', label: partyLabel, width: 32, format: 'text' },
  { key: 'invoiceCount', label: 'Jml Faktur', width: 14, format: 'number' },
  { key: 'totalAmount', label: 'Total', width: 20, format: 'currency' },
];

const DETAIL_COLUMNS: ExportColumn[] = [
  { key: 'groupCode', label: 'No. Faktur', width: 20, format: 'text' },
  { key: 'groupName', label: 'Pelanggan', width: 32, format: 'text' },
  // R11/L2 (20 Sep 2026) — kolom Salesman dipisah dari `groupName` supaya
  // "faktur mana dipegang salesman siapa" terlihat tanpa perlu memfilter
  // satu per satu (permintaan klien, Laporan poin 2).
  { key: 'salesmanName', label: 'Salesman', width: 24, format: 'text' },
  { key: 'invoiceDate', label: 'Tanggal', width: 14, format: 'date' },
  { key: 'totalAmount', label: 'Total', width: 20, format: 'currency' },
];

/**
 * Laporan Penjualan (Hari 30, CLAUDE.md §0) — per periode, dikelompokkan per
 * pelanggan ATAU per salesman (radio DASAR, §14.1 PANDUAN_UI), atau mode
 * Detail satu baris per faktur. TIDAK menghitung komisi — murni rekap
 * kinerja (jumlah faktur + total nilai), sesuai instruksi tugas.
 *
 * Filter `posting_status = 'POSTED'` (bukan menghapus baris VOID — VOID
 * tidak pernah dihapus, CLAUDE.md §2.1 — hanya dikeluarkan dari rekap
 * penjualan aktif, pola sama PaymentsService.findOpenInvoices()).
 */
@Injectable()
export class SalesReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSalesReport(
    dateFrom: string,
    dateTo: string,
    groupBy: SalesReportGroupBy = 'CUSTOMER',
    salesmanId?: string,
  ): Promise<ExportableResponse<SalesReportRow>> {
    if (groupBy === 'INVOICE') {
      return this.getDetailReport(dateFrom, dateTo, salesmanId);
    }
    return this.getGroupedReport(dateFrom, dateTo, groupBy);
  }

  private async getGroupedReport(
    dateFrom: string,
    dateTo: string,
    groupBy: 'CUSTOMER' | 'SALESMAN',
  ): Promise<ExportableResponse<SalesReportRow>> {
    const joinTable = groupBy === 'CUSTOMER' ? 'customers' : 'salesmen';
    const joinColumn = groupBy === 'CUSTOMER' ? 'customer_id' : 'salesman_id';
    const partyLabel = groupBy === 'CUSTOMER' ? 'Pelanggan' : 'Salesman';

    const rows: {
      id: string;
      code: string;
      name: string;
      invoice_count: string;
      total_amount: string;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.code, p.name,
              COUNT(si.id) AS invoice_count,
              COALESCE(SUM(si.total_amount), 0) AS total_amount
         FROM ${joinTable} p
         JOIN sales_invoices si ON si.${joinColumn} = p.id
        WHERE si.posting_status = 'POSTED'
          AND si.invoice_date BETWEEN $1 AND $2
        GROUP BY p.id, p.code, p.name
        ORDER BY total_amount DESC`,
      [dateFrom, dateTo],
    );

    const dataRows: SalesReportRow[] = rows.map((r) => ({
      groupCode: r.code,
      groupName: r.name,
      invoiceCount: Number(r.invoice_count),
      totalAmount: Number(r.total_amount),
    }));

    return {
      rows: [...dataRows, buildGrandTotalRow(dataRows)],
      columns: GROUPED_COLUMNS(partyLabel),
      meta: {
        title: 'Laporan Penjualan',
        subtitle: `Rekap per ${partyLabel.toLowerCase()}, periode ${dateFrom} s.d. ${dateTo}`,
      },
    };
  }

  private async getDetailReport(
    dateFrom: string,
    dateTo: string,
    salesmanId?: string,
  ): Promise<ExportableResponse<SalesReportRow>> {
    const params: string[] = [dateFrom, dateTo];
    let salesmanFilter = '';
    if (salesmanId) {
      params.push(salesmanId);
      salesmanFilter = `AND si.salesman_id = $${params.length}`;
    }

    const rows: {
      id: string;
      invoice_number: string;
      invoice_date: string;
      customer_name: string;
      salesman_name: string;
      total_amount: string;
    }[] = await this.dataSource.query(
      `SELECT si.id, si.invoice_number, si.invoice_date, c.name AS customer_name,
              sm.name AS salesman_name, si.total_amount
         FROM sales_invoices si
         JOIN customers c ON c.id = si.customer_id
         JOIN salesmen sm ON sm.id = si.salesman_id
        WHERE si.posting_status = 'POSTED'
          AND si.invoice_date BETWEEN $1 AND $2
          ${salesmanFilter}
        ORDER BY si.invoice_date ASC, si.invoice_number ASC`,
      params,
    );

    const dataRows: SalesReportRow[] = rows.map((r) => ({
      groupCode: r.invoice_number,
      groupName: r.customer_name,
      salesmanName: r.salesman_name,
      // toIsoDate() -- DataSource.query() mentah mengembalikan kolom `date`
      // sebagai objek Date (zona waktu lokal server), bukan string "YYYY-
      // MM-DD" yang diasumsikan formatDate() FE (lihat komentar
      // aging-bucket.util.ts) -- tanpa ini tanggal bisa mundur satu hari
      // untuk server WIB begitu di-JSON.stringify apa adanya.
      invoiceDate: toIsoDate(r.invoice_date),
      invoiceCount: 1,
      totalAmount: Number(r.total_amount),
      invoiceId: r.id,
    }));

    return {
      rows: [...dataRows, buildGrandTotalRow(dataRows)],
      columns: DETAIL_COLUMNS,
      meta: {
        title: 'Laporan Penjualan',
        subtitle: `Detail per faktur, periode ${dateFrom} s.d. ${dateTo}`,
      },
    };
  }
}

// Baris agregat "GRAND TOTAL :" (PANDUAN_UI.md §14.2) — ditambahkan sebagai
// baris terakhir `rows` supaya ikut terlihat di layar DAN di export Excel
// tanpa mekanisme terpisah (ExportInterceptor mengambil `rows` apa adanya).
function buildGrandTotalRow(dataRows: SalesReportRow[]): SalesReportRow {
  return {
    groupCode: null,
    groupName: 'GRAND TOTAL',
    invoiceCount: dataRows.reduce((sum, r) => sum + r.invoiceCount, 0),
    totalAmount: dataRows.reduce((sum, r) => sum + r.totalAmount, 0),
    isGrandTotal: true,
  };
}
