import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { todayIso } from './aging-bucket.util';
import { ReceivablesReportService } from './receivables-report.service';

export interface DashboardSummary {
  date: string;
  salesToday: { count: number; total: number };
  receivables: {
    /** Σ sisa piutang semua pelanggan (termasuk saldo awal). */
    outstandingTotal: number;
    /** Σ sisa faktur penjualan yang due_date-nya SUDAH lewat. */
    overdueTotal: number;
    overdueInvoiceCount: number;
  };
  /** Produk dengan saldo gudang STORE < 0 (§2.8 stok minus diizinkan). */
  negativeStockCount: number;
}

/**
 * Ringkasan beranda (need_fixing.md #9) — MENGGANTI angka "—" placeholder.
 * Sengaja MEMAKAI ULANG logika laporan yang sudah ada, tidak menulis query
 * baru yang bisa diam-diam menghitung beda:
 *   - sisa piutang = ReceivablesReportService.getAgingReport() (FIFO buku
 *     besar piutang per pelanggan, sama dengan Laporan Piutang); "jatuh
 *     tempo" = baris yang menunjuk faktur penjualan ber-due_date < hari ini.
 *     Saldo awal piutang tidak punya due_date — ikut total, tidak ikut
 *     "jatuh tempo".
 *   - penjualan hari ini = faktur POSTED bertanggal hari ini (total_amount).
 * "Hari ini" = tanggal lokal server (todayIso, pola laporan aging).
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly receivablesReportService: ReceivablesReportService,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const today = todayIso();

    const salesRows: { count: string; total: string | null }[] =
      await this.dataSource.query(
        `SELECT COUNT(*)::int AS count, SUM(total_amount) AS total
         FROM sales_invoices
         WHERE posting_status = 'POSTED' AND invoice_date = $1`,
        [today],
      );

    const aging = await this.receivablesReportService.getAgingReport();
    const invoiceAmounts = new Map<string, number>();
    let outstandingCents = 0;
    for (const d of aging.detail) {
      outstandingCents += Math.round(d.amount * 100);
      if (d.invoiceId) {
        invoiceAmounts.set(
          d.invoiceId,
          (invoiceAmounts.get(d.invoiceId) ?? 0) + d.amount,
        );
      }
    }
    let overdueCents = 0;
    let overdueCount = 0;
    if (invoiceAmounts.size > 0) {
      const dueRows: { id: string }[] = await this.dataSource.query(
        `SELECT id FROM sales_invoices WHERE id = ANY($1) AND due_date < $2`,
        [[...invoiceAmounts.keys()], today],
      );
      for (const row of dueRows) {
        overdueCents += Math.round((invoiceAmounts.get(row.id) ?? 0) * 100);
        overdueCount++;
      }
    }

    const negativeRows: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM (
         SELECT b.product_id
         FROM product_stock_balance b
         JOIN warehouses w ON w.id = b.warehouse_id
         WHERE w.warehouse_type = 'STORE'
         GROUP BY b.product_id
         HAVING SUM(b.qty_base_unit) < 0
       ) neg`,
    );

    return {
      date: today,
      salesToday: {
        count: Number(salesRows[0]?.count ?? 0),
        total: Number(salesRows[0]?.total ?? 0),
      },
      receivables: {
        outstandingTotal: outstandingCents / 100,
        overdueTotal: overdueCents / 100,
        overdueInvoiceCount: overdueCount,
      },
      negativeStockCount: Number(negativeRows[0]?.count ?? 0),
    };
  }
}
