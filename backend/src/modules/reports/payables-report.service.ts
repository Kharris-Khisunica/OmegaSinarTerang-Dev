import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';
import { PaymentInvoiceType } from '../payments/entities/payment.entity';
import { PaymentsService } from '../payments/payments.service';
import { SettingsService } from '../settings/settings.service';
import {
  bucketIndexFor,
  bucketLabels,
  daysBetween,
  todayIso,
  toIsoDate,
} from './aging-bucket.util';

export interface PayablesAgingRow extends Record<string, unknown> {
  partyId: string | null;
  partyCode: string | null;
  partyName: string;
  bucket1: number;
  bucket2: number;
  bucket3: number;
  bucket4: number;
  total: number;
  isGrandTotal?: boolean;
}

export interface PayablesAgingDetailRow {
  partyId: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  bucketIndex: number;
  amount: number;
}

export interface PayablesAgingResult extends ExportableResponse<PayablesAgingRow> {
  detail: PayablesAgingDetailRow[];
  bucketDays: number;
}

/**
 * Laporan Hutang / umur hutang (Hari 30, CLAUDE.md §0). BEDA dari Piutang:
 * `journal_entry_lines` TIDAK punya kolom `supplier_id` (akun Hutang Usaha
 * satu akun, tidak dipecah per-supplier di GL) -- sumber kebenaran saldo
 * per-supplier WAJIB dari `purchase_invoices` + `payments`, lewat
 * `PaymentsService.getOutstandingInvoicesForReport()` (logika SAMA dengan
 * `getOutstandingInvoices()`/`findOpenInvoices()` yang dipakai layar
 * Pembayaran) -- BUKAN query outstanding baru, dan BUKAN resolver GL
 * per-supplier tandingan `ArAccountResolverService`.
 *
 * Umur dihitung dari `due_date` (= `supplier_invoice_date` + termin, CLAUDE.md
 * §3 "Pembelian"), BUKAN `receipt_date`.
 */
@Injectable()
export class PayablesReportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getAgingReport(): Promise<PayablesAgingResult> {
    const bucketDays = await this.readBucketDays();
    const labels = bucketLabels(bucketDays);
    const today = todayIso();

    const outstanding =
      await this.paymentsService.getOutstandingInvoicesForReport(
        PaymentInvoiceType.PURCHASE,
      );

    const bySupplier = new Map<string, { buckets: number[]; total: number }>();
    const detail: PayablesAgingDetailRow[] = [];

    for (const inv of outstanding) {
      if (Math.round(inv.outstanding) === 0) continue;
      // toIsoDate() -- PaymentsService.getOutstandingInvoicesForReport()
      // meneruskan due_date/receipt_date mentah dari DataSource.query(),
      // yang datang sebagai objek Date, bukan string (lihat komentar
      // aging-bucket.util.ts). Dinormalisasi di sini, sebelum dipakai
      // daysBetween() ATAU disimpan ke `detail` untuk FE.
      const dueDate = toIsoDate(inv.dueDate ?? inv.invoiceDate);
      const ageDays = daysBetween(dueDate, today);
      const idx = bucketIndexFor(ageDays, bucketDays);
      if (!bySupplier.has(inv.partyId)) {
        bySupplier.set(inv.partyId, { buckets: [0, 0, 0, 0], total: 0 });
      }
      const acc = bySupplier.get(inv.partyId)!;
      acc.buckets[idx] += inv.outstanding;
      acc.total += inv.outstanding;
      detail.push({
        partyId: inv.partyId,
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        dueDate,
        bucketIndex: idx,
        amount: inv.outstanding,
      });
    }

    const supplierIds = [...bySupplier.keys()];
    const suppliers = await this.loadSuppliers(supplierIds);

    const rows: PayablesAgingRow[] = supplierIds.map((supplierId) => {
      const acc = bySupplier.get(supplierId)!;
      const supplier = suppliers.get(supplierId);
      return {
        partyId: supplierId,
        partyCode: supplier?.displayCode ?? null,
        partyName: supplier?.name ?? '(supplier tidak ditemukan)',
        bucket1: acc.buckets[0],
        bucket2: acc.buckets[1],
        bucket3: acc.buckets[2],
        bucket4: acc.buckets[3],
        total: acc.total,
      };
    });
    rows.sort((a, b) => b.total - a.total);

    const grandTotal: PayablesAgingRow = {
      partyId: null,
      partyCode: null,
      partyName: 'GRAND TOTAL',
      bucket1: rows.reduce((s, r) => s + r.bucket1, 0),
      bucket2: rows.reduce((s, r) => s + r.bucket2, 0),
      bucket3: rows.reduce((s, r) => s + r.bucket3, 0),
      bucket4: rows.reduce((s, r) => s + r.bucket4, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
      isGrandTotal: true,
    };

    return {
      rows: [...rows, grandTotal],
      columns: buildColumns(labels),
      meta: {
        title: 'Laporan Hutang (Umur Hutang)',
        subtitle: `Bucket umur ${bucketDays} hari dari jatuh tempo, per ${today}`,
      },
      detail,
      bucketDays,
    };
  }

  private async readBucketDays(): Promise<number> {
    const settings = await this.settingsService.findAll();
    const setting = settings.find((s) => s.key === 'aging_bucket_days');
    const value = setting ? Number(setting.value) : 30;
    return value > 0 ? value : 30;
  }

  private async loadSuppliers(
    supplierIds: string[],
  ): Promise<Map<string, { displayCode: string; name: string }>> {
    if (supplierIds.length === 0) return new Map();
    const rows: { id: string; display_code: string; name: string }[] =
      await this.dataSource.query(
        `SELECT id, display_code, name FROM suppliers WHERE id = ANY($1)`,
        [supplierIds],
      );
    return new Map(
      rows.map((r) => [r.id, { displayCode: r.display_code, name: r.name }]),
    );
  }
}

function buildColumns(
  labels: [string, string, string, string],
): ExportColumn[] {
  return [
    { key: 'partyCode', label: 'Kode', width: 14, format: 'text' },
    { key: 'partyName', label: 'Supplier', width: 30, format: 'text' },
    { key: 'bucket1', label: labels[0], width: 16, format: 'currency' },
    { key: 'bucket2', label: labels[1], width: 16, format: 'currency' },
    { key: 'bucket3', label: labels[2], width: 16, format: 'currency' },
    { key: 'bucket4', label: labels[3], width: 16, format: 'currency' },
    { key: 'total', label: 'Total', width: 18, format: 'currency' },
  ];
}
