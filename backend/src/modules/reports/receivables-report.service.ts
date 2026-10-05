import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ExportColumn,
  ExportableResponse,
} from '../../core/export/export.types';
import { SettingsService } from '../settings/settings.service';
import {
  bucketIndexFor,
  bucketLabels,
  daysBetween,
  todayIso,
  toIsoDate,
} from './aging-bucket.util';

export interface ReceivablesAgingRow extends Record<string, unknown> {
  partyId: string | null;
  partyCode: string | null;
  partyName: string;
  arAccountCode: string | null;
  bucket1: number;
  bucket2: number;
  bucket3: number;
  bucket4: number;
  total: number;
  isGrandTotal?: boolean;
}

export interface ReceivablesAgingDetailRow {
  partyId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  refDate: string;
  bucketIndex: number;
  amount: number;
  sourceLabel: string;
}

export interface ReceivablesAgingResult extends ExportableResponse<ReceivablesAgingRow> {
  detail: ReceivablesAgingDetailRow[];
  bucketDays: number;
}

interface LedgerLineRow {
  customer_id: string;
  entry_date: string;
  source_type: string;
  source_id: string | null;
  debit_amount: string;
  credit_amount: string;
}

interface OpenLot {
  date: string;
  sourceType: string;
  sourceId: string | null;
  remaining: number;
}

/**
 * Laporan Piutang / umur piutang (Hari 30, CLAUDE.md §0). Total per
 * pelanggan WAJIB direkonsiliasi ke buku besar lewat
 * `journal_entry_lines.customer_id` (tag wajib di 5 titik sejak Hari 18) --
 * TIDAK dihitung ulang dari `sales_invoices`, supaya VOID/retur yang tidak
 * tersentuh tidak bisa diam-diam membuat laporan menyimpang dari GL.
 *
 * Filternya `chart_of_accounts.is_receivable_account = true` (BUKAN
 * `account_id = default_ar_account_id`) -- pelanggan ber-`ar_account_id`
 * custom (CLAUDE.md §3) tetap tertangkap karena flag-nya, bukan ID akun
 * tunggal, yang dicocokkan. Ini juga yang menyaring baris `customer_id`
 * lain yang BUKAN piutang (mis. baris Selisih Pembayaran, yang juga ditag
 * `customer_id` oleh PaymentsService.confirm() tapi akunnya bukan piutang).
 *
 * Umur dihitung lewat pencocokan FIFO murni di level buku besar (baris
 * debit = lot terbuka, baris kredit mengonsumsi lot tertua dulu) -- BUKAN
 * dari `sales_invoices`, jadi total tetap sama persis dengan SUM(debit-
 * credit) per pelanggan berapa pun sumber baris kreditnya (pembayaran,
 * retur, atau pembalikan VOID). Tiap lot yang tersisa membawa
 * `source_type`/`source_id` dari `journal_entries` -- untuk baris
 * bersumber SALES_INVOICE, `source_id` PERSIS `sales_invoices.id`, jadi FE
 * bisa menautkan nominal ke fakturnya tanpa query tambahan (DoD "angka bisa
 * diklik sampai ke dokumen sumbernya"). Lot dari OPENING_BALANCE tidak
 * pernah ada faktur di baliknya -- ditandai `sourceLabel` "Saldo Awal",
 * tidak bisa diklik.
 */
@Injectable()
export class ReceivablesReportService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  async getAgingReport(): Promise<ReceivablesAgingResult> {
    const bucketDays = await this.readBucketDays();
    const labels = bucketLabels(bucketDays);
    const today = todayIso();

    const lines: LedgerLineRow[] = await this.dataSource.query(
      `SELECT jel.customer_id, je.entry_date, je.source_type, je.source_id,
              jel.debit_amount, jel.credit_amount
         FROM journal_entry_lines jel
         JOIN journal_entries je ON je.id = jel.journal_entry_id
         JOIN chart_of_accounts coa ON coa.id = jel.account_id
        WHERE jel.customer_id IS NOT NULL
          AND coa.is_receivable_account = true
        ORDER BY jel.customer_id, je.entry_date ASC, je.created_at ASC`,
    );

    const openLotsByCustomer = fifoConsume(lines);

    const customerIds = [...openLotsByCustomer.keys()];
    const customers = await this.loadCustomers(customerIds);
    const arAccountCodes = await this.loadArAccountCodes(customerIds);

    const rows: ReceivablesAgingRow[] = [];
    const detail: ReceivablesAgingDetailRow[] = [];

    for (const [customerId, lots] of openLotsByCustomer) {
      const buckets = [0, 0, 0, 0];
      let total = 0;
      for (const lot of lots) {
        if (Math.round(lot.remaining) === 0) continue;
        const ageDays = daysBetween(lot.date, today);
        const idx = bucketIndexFor(ageDays, bucketDays);
        buckets[idx] += lot.remaining;
        total += lot.remaining;
        detail.push({
          partyId: customerId,
          invoiceId: lot.sourceType === 'SALES_INVOICE' ? lot.sourceId : null,
          invoiceNumber: null,
          refDate: lot.date,
          bucketIndex: idx,
          amount: lot.remaining,
          sourceLabel: sourceLabelFor(lot.sourceType),
        });
      }
      if (Math.round(total) === 0) continue;
      const customer = customers.get(customerId);
      rows.push({
        partyId: customerId,
        partyCode: customer?.code ?? null,
        partyName: customer?.name ?? '(pelanggan tidak ditemukan)',
        arAccountCode: arAccountCodes.get(customerId) ?? null,
        bucket1: buckets[0],
        bucket2: buckets[1],
        bucket3: buckets[2],
        bucket4: buckets[3],
        total,
      });
    }
    rows.sort((a, b) => b.total - a.total);

    // Nomor faktur diisi belakangan (satu query batch, bukan N+1) supaya
    // detail bisa tampil rapi tanpa FE perlu join sendiri.
    await this.fillInvoiceNumbers(detail);

    const grandTotal: ReceivablesAgingRow = {
      partyId: null,
      partyCode: null,
      partyName: 'GRAND TOTAL',
      arAccountCode: null,
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
        title: 'Laporan Piutang (Umur Piutang)',
        subtitle: `Bucket umur ${bucketDays} hari, per ${today}`,
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

  private async loadCustomers(
    customerIds: string[],
  ): Promise<Map<string, { code: string; name: string }>> {
    if (customerIds.length === 0) return new Map();
    const rows: { id: string; code: string; name: string }[] =
      await this.dataSource.query(
        `SELECT id, code, name FROM customers WHERE id = ANY($1)`,
        [customerIds],
      );
    return new Map(rows.map((r) => [r.id, { code: r.code, name: r.name }]));
  }

  /**
   * Akun piutang EFEKTIF per pelanggan (murni informasional untuk kolom
   * "Akun Piutang") -- logika SAMA dengan `ArAccountResolverService.resolve()`
   * (customer.ar_account_id ?? settings.default_ar_account_id), ditulis
   * sebagai satu query batch di sini karena resolver aslinya per-pelanggan
   * (dipanggil di jalur transaksi, bukan laporan lintas semua pelanggan).
   */
  private async loadArAccountCodes(
    customerIds: string[],
  ): Promise<Map<string, string>> {
    if (customerIds.length === 0) return new Map();
    const rows: { id: string; code: string }[] = await this.dataSource.query(
      `SELECT c.id, coa.code
         FROM customers c
         JOIN settings s ON s.key = 'default_ar_account_id'
         JOIN chart_of_accounts coa
           ON coa.id = COALESCE(c.ar_account_id, s.value::uuid)
        WHERE c.id = ANY($1)`,
      [customerIds],
    );
    return new Map(rows.map((r) => [r.id, r.code]));
  }

  private async fillInvoiceNumbers(
    detail: ReceivablesAgingDetailRow[],
  ): Promise<void> {
    const invoiceIds = [
      ...new Set(
        detail.filter((d) => d.invoiceId).map((d) => d.invoiceId as string),
      ),
    ];
    if (invoiceIds.length === 0) return;
    const rows: { id: string; invoice_number: string }[] =
      await this.dataSource.query(
        `SELECT id, invoice_number FROM sales_invoices WHERE id = ANY($1)`,
        [invoiceIds],
      );
    const map = new Map(rows.map((r) => [r.id, r.invoice_number]));
    for (const d of detail) {
      if (d.invoiceId) d.invoiceNumber = map.get(d.invoiceId) ?? null;
    }
  }
}

function sourceLabelFor(sourceType: string): string {
  if (sourceType === 'SALES_INVOICE') return 'Faktur';
  if (sourceType === 'OPENING_BALANCE') return 'Saldo Awal';
  return sourceType;
}

/**
 * FIFO murni per pelanggan: baris debit = lot terbuka baru, baris kredit
 * mengonsumsi lot TERTUA dulu. Invarian: SUM(remaining tersisa) per
 * pelanggan == SUM(debit-credit) baris pelanggan itu, persis -- karena FIFO
 * hanya memindahkan "siapa yang dikonsumsi", tidak pernah mengubah total.
 */
function fifoConsume(lines: LedgerLineRow[]): Map<string, OpenLot[]> {
  const result = new Map<string, OpenLot[]>();
  for (const line of lines) {
    if (!result.has(line.customer_id)) result.set(line.customer_id, []);
    const lots = result.get(line.customer_id)!;
    const debit = Number(line.debit_amount);
    const credit = Number(line.credit_amount);
    if (debit > 0) {
      lots.push({
        // toIsoDate() -- `entry_date` datang sebagai objek Date (bukan
        // string) lewat DataSource.query() mentah, lihat komentar
        // aging-bucket.util.ts. Dinormalisasi di sini, titik masuk satu-
        // satunya, supaya seluruh kode di bawahnya bisa percaya penuh
        // `OpenLot.date` selalu "YYYY-MM-DD".
        date: toIsoDate(line.entry_date),
        sourceType: line.source_type,
        sourceId: line.source_id,
        remaining: debit,
      });
    }
    if (credit > 0) {
      let toConsume = credit;
      while (toConsume > 0 && lots.length > 0) {
        const lot = lots[0];
        const consumed = Math.min(lot.remaining, toConsume);
        lot.remaining -= consumed;
        toConsume -= consumed;
        if (lot.remaining <= 0) lots.shift();
      }
      // toConsume tersisa (kredit tanpa debit yang mendahuluinya, mis. data
      // tidak konsisten) sengaja DIABAIKAN di sini -- tidak membuat remaining
      // lot manapun negatif, supaya total tetap sama dengan SUM(debit-credit)
      // walau urutannya di baris ini bukan penyebabnya.
    }
  }
  return result;
}

function buildColumns(
  labels: [string, string, string, string],
): ExportColumn[] {
  return [
    { key: 'partyCode', label: 'Kode', width: 12, format: 'text' },
    { key: 'partyName', label: 'Pelanggan', width: 30, format: 'text' },
    { key: 'arAccountCode', label: 'Akun Piutang', width: 16, format: 'text' },
    { key: 'bucket1', label: labels[0], width: 16, format: 'currency' },
    { key: 'bucket2', label: labels[1], width: 16, format: 'currency' },
    { key: 'bucket3', label: labels[2], width: 16, format: 'currency' },
    { key: 'bucket4', label: labels[3], width: 16, format: 'currency' },
    { key: 'total', label: 'Total', width: 18, format: 'currency' },
  ];
}
