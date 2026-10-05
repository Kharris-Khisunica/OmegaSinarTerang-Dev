import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { PrintLockService } from '../../core/print-lock/print-lock.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StepUpService } from '../../core/step-up/step-up.service';
import { VoidEngineService } from '../../core/void/void.service';
import { Role } from '../../common/enums/role.enum';
import { buildPaginatedResult, PaginatedResult } from '../../common/pagination';
import { ActionType } from '../authorization-requests/action-type.enum';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { PurchaseInvoice } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SalesInvoice } from '../sales-invoices/entities/sales-invoice.entity';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { OpenInvoicesQueryDto } from './dto/open-invoices-query.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { PaymentBatch } from './entities/payment-batch.entity';
import { Payment, PaymentInvoiceType } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';

// toCents(10_000) — CLAUDE.md §2.18: selisih di ATAS Rp 10.000 ditandai
// (bukan >=), tidak pernah diblokir, tidak ada batas nominal.
const DISCREPANCY_FLAG_THRESHOLD_CENTS = 1_000_000;

type QueryRunner = DataSource | EntityManager;

interface OpenInvoiceRow {
  id: string;
  partyId: string;
  partyName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  totalAmountCents: number;
}

export interface ConfirmPaymentResult {
  paymentBatch: PaymentBatch;
  payments: Payment[];
  journalEntry: JournalEntry;
}

export interface VoidPaymentResult {
  paymentBatch: PaymentBatch;
}

export interface PaymentListRow {
  id: string;
  batchNumber: string;
  paymentDate: string;
  totalAmount: number;
  postingStatus: string;
  printStatus: string;
  createdAt: string;
  invoiceType: PaymentInvoiceType | null;
  partyNames: string | null;
}

export interface PaymentDetailMethod {
  id: string;
  cashAccountId: string;
  cashAccountCode: string;
  cashAccountName: string;
  amount: number;
}

export interface PaymentDetailLine {
  id: string;
  invoiceType: PaymentInvoiceType;
  invoiceId: string;
  invoiceNumber: string;
  partyName: string;
  allocatedAmount: number;
  settledInFull: boolean;
  discrepancyAmount: number;
  methods: PaymentDetailMethod[];
}

export interface PaymentDetailResult {
  paymentBatch: PaymentBatch;
  // Ringkasan agregat (GROUP BY cash_account_id) lintas SEMUA baris faktur di
  // batch ini — dipakai overview "Metode Pembayaran" + kaki kwitansi.
  // Rincian per faktur ada di lines[].methods (koreksi 26 Sep 2026, metode
  // sekarang per baris, lihat PaymentMethod).
  methodsSummary: PaymentDetailMethod[];
  lines: PaymentDetailLine[];
}

/**
 * Payment / Kas & Bank (Hari 26-27, CLAUDE.md §2.12 lewat KONTEKS_REVISI_2026-07-28.md
 * §2.12 + memory hari26-payment-module-design) — skema payment_batches TIDAK punya
 * party di header (satu batch boleh lintas banyak pelanggan/supplier, party
 * di-resolve per baris).
 *
 * Paket R9 (KB1, `docs/RENCANA_REVISI_TESTING_KLIEN.md` §3): confirm() SUDAH
 * BENAR menerima faktur dari beberapa pihak dalam satu batch sejak Hari 27 —
 * tiap baris me-resolve customer/AR account-nya SENDIRI (lihat loop di
 * confirm()). Yang diperluas R9 hanyalah GET /payments/open-invoices
 * (findOpenInvoicesList(), partyId opsional) dan label `partyNames` di
 * findAll() (buildPartyLabel()) — bukan confirm() itu sendiri.
 *
 * Koreksi 26 Sep 2026: `POST /payments/preview-allocation` (Hari 26, FIFO
 * otomatis untuk SATU pihak dari satu nominal total) DIHAPUS — begitu metode
 * pembayaran pindah ke per baris faktur (lihat PaymentMethod), tidak ada lagi
 * "satu nominal total" untuk di-FIFO-kan. FE sudah berhenti memanggilnya
 * sejak paket R9 (lihat komentar lama PaymentAllocationForm.vue).
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly accountResolverService: AccountResolverService,
    private readonly documentCounterService: DocumentCounterService,
    private readonly journalPosterService: JournalPosterService,
    private readonly arAccountResolverService: ArAccountResolverService,
    private readonly stepUpService: StepUpService,
    private readonly voidEngineService: VoidEngineService,
    private readonly printLockService: PrintLockService,
  ) {}

  /**
   * Daftar faktur terbuka (outstanding > 0), dipakai BERSAMA oleh
   * `findOpenInvoicesList()`
   * (Hari 27 FE, diperluas paket R9 — daftar lengkap untuk alokasi manual,
   * `partyId` opsional sejak R9, tidak dibatasi jumlah yang diminta), DAN
   * `getOutstandingInvoicesForReport()`
   * (Hari 30 — Laporan Hutang, `partyId` dikosongkan supaya mencakup SEMUA
   * supplier sekaligus) — satu logika, tiga konsumen, supaya "sisa faktur"
   * tidak pernah dihitung dua cara berbeda yang bisa diam-diam menyimpang.
   */
  private async getOutstandingInvoices(
    invoiceType: PaymentInvoiceType,
    partyId?: string,
  ): Promise<(OpenInvoiceRow & { outstandingCents: number })[]> {
    const openInvoices = await this.findOpenInvoices(invoiceType, partyId);
    const invoiceIds = openInvoices.map((inv) => inv.id);
    const alreadyPaidCentsByInvoice = await this.getAlreadyPaidCents(
      invoiceType,
      invoiceIds,
    );
    const alreadyReducedCentsByInvoice =
      invoiceType === PaymentInvoiceType.SALES
        ? await this.getAlreadyReducedBySalesReturnsCents(invoiceIds)
        : new Map<string, number>();

    return openInvoices
      .map((inv) => {
        const alreadyPaidCents = alreadyPaidCentsByInvoice.get(inv.id) ?? 0;
        const alreadyReducedCents =
          alreadyReducedCentsByInvoice.get(inv.id) ?? 0;
        const outstandingCents =
          inv.totalAmountCents - alreadyPaidCents - alreadyReducedCents;
        return { ...inv, outstandingCents };
      })
      .filter((inv) => inv.outstandingCents > 0);
  }

  /**
   * `GET /payments/open-invoices` (Hari 27 FE, diperluas paket R9/KB1) —
   * daftar LENGKAP faktur terbuka, TIDAK dibatasi oleh jumlah yang mau
   * dibayar. `partyId` sekarang OPSIONAL — kosong
   * = lintas pihak, dipakai grid Kas & Bank multi-baris (PaymentsService
   * .confirm() sudah menerima lines lintas pihak dalam satu batch sejak
   * Hari 27, lihat komentar kelas ini). `search` (nomor faktur) + `limit`
   * mencegah daftar lintas pihak membanjiri layar. `partyId`/`partyName`
   * dikirim PER BARIS (bukan sekali di header) karena satu daftar sekarang
   * bisa mencampur banyak pihak sekaligus.
   */
  async findOpenInvoicesList(dto: OpenInvoicesQueryDto): Promise<{
    invoices: {
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      totalAmount: number;
      outstanding: number;
      partyId: string;
      partyName: string;
    }[];
  }> {
    const outstanding = await this.getOutstandingInvoices(
      dto.invoiceType,
      dto.partyId,
    );
    const searchLower = dto.search?.trim().toLowerCase();
    const filtered = searchLower
      ? outstanding.filter((inv) =>
          inv.invoiceNumber.toLowerCase().includes(searchLower),
        )
      : outstanding;
    const limit = dto.limit ?? 50;
    return {
      invoices: filtered.slice(0, limit).map((inv) => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        totalAmount: fromCents(inv.totalAmountCents),
        outstanding: fromCents(inv.outstandingCents),
        partyId: inv.partyId,
        partyName: inv.partyName,
      })),
    };
  }

  /**
   * `runner` opsional (default this.dataSource) — Hari 27 confirm() memanggil
   * ulang persis logika ini dengan `manager` transaction-nya sendiri supaya
   * "sisa faktur" yang dipakai untuk menghitung selisih dikunci di baris yang
   * sama (lihat lockInvoiceForUpdate()), bukan query terpisah yang bisa balapan
   * dengan payment lain atas faktur yang sama. `partyId` kosong (Hari 30,
   * Laporan Hutang) = tidak difilter party sama sekali, mencakup semua
   * supplier/pelanggan sekaligus — dipakai `getOutstandingInvoicesForReport()`.
   */
  private async findOpenInvoices(
    invoiceType: PaymentInvoiceType,
    partyId: string | undefined,
    runner: QueryRunner = this.dataSource,
  ): Promise<OpenInvoiceRow[]> {
    if (invoiceType === PaymentInvoiceType.SALES) {
      const params: unknown[] = [];
      let partyFilter = '';
      if (partyId) {
        params.push(partyId);
        partyFilter = `AND si.customer_id = $${params.length}`;
      }
      const rows: {
        id: string;
        customer_id: string;
        customer_name: string;
        invoice_number: string;
        invoice_date: string;
        total_amount: string;
      }[] = await runner.query(
        `SELECT si.id, si.customer_id, cust.name AS customer_name,
                si.invoice_number, si.invoice_date, si.total_amount
         FROM sales_invoices si
         JOIN customers cust ON cust.id = si.customer_id
         WHERE si.posting_status = 'POSTED' ${partyFilter}
         ORDER BY si.invoice_date ASC, si.invoice_number ASC`,
        params,
      );
      return rows.map((r) => ({
        id: r.id,
        partyId: r.customer_id,
        partyName: r.customer_name,
        invoiceNumber: r.invoice_number,
        invoiceDate: r.invoice_date,
        totalAmountCents: toCents(Number(r.total_amount)),
      }));
    }

    const params: unknown[] = [];
    let partyFilter = '';
    if (partyId) {
      params.push(partyId);
      partyFilter = `AND pi.supplier_id = $${params.length}`;
    }
    const rows: {
      id: string;
      supplier_id: string;
      supplier_name: string;
      invoice_number: string;
      receipt_date: string;
      due_date: string;
      total_amount: string;
    }[] = await runner.query(
      `SELECT pi.id, pi.supplier_id, sup.name AS supplier_name,
              pi.invoice_number, pi.receipt_date, pi.due_date, pi.total_amount
       FROM purchase_invoices pi
       JOIN suppliers sup ON sup.id = pi.supplier_id
       WHERE pi.posting_status = 'POSTED' ${partyFilter}
       ORDER BY pi.receipt_date ASC, pi.invoice_number ASC`,
      params,
    );
    return rows.map((r) => ({
      id: r.id,
      partyId: r.supplier_id,
      partyName: r.supplier_name,
      invoiceNumber: r.invoice_number,
      invoiceDate: r.receipt_date,
      dueDate: r.due_date,
      totalAmountCents: toCents(Number(r.total_amount)),
    }));
  }

  /**
   * `GET /reports/payables-aging` (Hari 30, CLAUDE.md §0 "Laporan Hutang") —
   * SEMUA faktur pembelian terbuka lintas supplier sekaligus, lewat logika
   * "sisa faktur" YANG SAMA dengan layar Pembayaran (`getOutstandingInvoices()`
   * di atas) — dilarang menulis query outstanding baru yang bisa diam-diam
   * menghitung beda dari layar pembayaran (KONTEKS_REVISI Hari 30). Dipakai
   * `PayablesReportService`, TIDAK dipakai jalur Payment sendiri.
   */
  async getOutstandingInvoicesForReport(
    invoiceType: PaymentInvoiceType,
  ): Promise<
    {
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      dueDate: string | null;
      partyId: string;
      totalAmount: number;
      outstanding: number;
    }[]
  > {
    const outstanding = await this.getOutstandingInvoices(invoiceType);
    return outstanding.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate ?? null,
      partyId: inv.partyId,
      totalAmount: fromCents(inv.totalAmountCents),
      outstanding: fromCents(inv.outstandingCents),
    }));
  }

  /**
   * SUM(payments.allocated_amount) per faktur, hanya dari payment_batches yang
   * BELUM di-VOID — dasar "sisa faktur" bersama findOpenInvoices() di atas.
   */
  private async getAlreadyPaidCents(
    invoiceType: PaymentInvoiceType,
    invoiceIds: string[],
    runner: QueryRunner = this.dataSource,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (invoiceIds.length === 0) {
      return result;
    }
    const rows: { invoice_id: string; total: string | null }[] =
      await runner.query(
        `SELECT p.invoice_id, SUM(p.allocated_amount) AS total
         FROM payments p
         JOIN payment_batches pb ON pb.id = p.payment_batch_id
         WHERE p.invoice_type = $1
           AND p.invoice_id = ANY($2::uuid[])
           AND pb.posting_status = 'POSTED'
         GROUP BY p.invoice_id`,
        [invoiceType, invoiceIds],
      );
    for (const row of rows) {
      result.set(row.invoice_id, toCents(Number(row.total ?? 0)));
    }
    return result;
  }

  /**
   * Retur penjualan settlement_type=REDUCE_INVOICE mengurangi sisa faktur asal
   * secara nyata (bukan lewat kas) — CLAUDE.md §2.18/§4 "settlement_type". TIDAK
   * ada padanan di sisi PURCHASE: purchase_returns tidak menunjuk purchase_invoice
   * tertentu (CLAUDE.md §3 "Bad stock" — retur pembelian di-scope ke supplier,
   * bukan faktur), jadi tidak ada pengurangan setara di sana.
   */
  private async getAlreadyReducedBySalesReturnsCents(
    invoiceIds: string[],
    runner: QueryRunner = this.dataSource,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (invoiceIds.length === 0) {
      return result;
    }
    const rows: { sales_invoice_id: string; total: string | null }[] =
      await runner.query(
        `SELECT sales_invoice_id, SUM(total_amount) AS total
         FROM sales_returns
         WHERE settlement_type = 'REDUCE_INVOICE'
           AND posting_status = 'POSTED'
           AND sales_invoice_id = ANY($1::uuid[])
         GROUP BY sales_invoice_id`,
        [invoiceIds],
      );
    for (const row of rows) {
      result.set(row.sales_invoice_id, toCents(Number(row.total ?? 0)));
    }
    return result;
  }

  /**
   * SELECT ... FOR UPDATE satu faktur (Hari 27 confirm()) + hitung sisa
   * faktur-nya lewat helper yang SAMA dengan preview (getAlreadyPaidCents/
   * getAlreadyReducedBySalesReturnsCents), tapi terkunci di dalam transaction
   * pemanggil — dua confirm() atas faktur yang sama nyaris bersamaan tidak
   * bisa lagi sama-sama membaca "sisa" yang sama sebelum salah satu menulis.
   */
  private async lockInvoiceAndGetOutstandingCents(
    invoiceType: PaymentInvoiceType,
    invoiceId: string,
    manager: EntityManager,
  ): Promise<{ totalAmountCents: number; outstandingCents: number }> {
    const table =
      invoiceType === PaymentInvoiceType.SALES
        ? 'sales_invoices'
        : 'purchase_invoices';
    const rows: { total_amount: string; posting_status: string }[] =
      await manager.query(
        `SELECT total_amount, posting_status FROM ${table} WHERE id = $1 FOR UPDATE`,
        [invoiceId],
      );
    if (rows.length === 0) {
      throw new BadRequestException('Faktur tidak ditemukan.');
    }
    if (rows[0].posting_status !== 'POSTED') {
      throw new BadRequestException('Faktur ini sudah dibatalkan (VOID).');
    }
    const totalAmountCents = toCents(Number(rows[0].total_amount));
    const alreadyPaidCents =
      (await this.getAlreadyPaidCents(invoiceType, [invoiceId], manager)).get(
        invoiceId,
      ) ?? 0;
    const alreadyReducedCents =
      invoiceType === PaymentInvoiceType.SALES
        ? ((
            await this.getAlreadyReducedBySalesReturnsCents(
              [invoiceId],
              manager,
            )
          ).get(invoiceId) ?? 0)
        : 0;
    return {
      totalAmountCents,
      outstandingCents:
        totalAmountCents - alreadyPaidCents - alreadyReducedCents,
    };
  }

  private async readCashOutflowThreshold(): Promise<number> {
    const rows: { value: string }[] = await this.dataSource.query(
      `SELECT value FROM settings WHERE key = 'cash_outflow_approval_threshold'`,
    );
    return rows[0] ? Number(rows[0].value) : 0;
  }

  /**
   * `POST /payments/confirm` (Hari 27, koreksi 26 Sep 2026 — metode per baris
   * faktur) — satu jurnal balanced per batch: baris kas per akun (diagregasi
   * lintas SEMUA baris faktur yang memakai akun yang sama) + baris
   * Piutang/Hutang per faktur + baris Selisih Pembayaran (hanya kalau
   * operator menandai LUNAS dan nominalnya tidak persis — CLAUDE.md §2.18).
   * `resolveArAccount()`/`AccountResolverService` dipakai untuk akun
   * piutang/hutang, TIDAK PERNAH akun default langsung.
   */
  async confirm(
    dto: ConfirmPaymentDto,
    user: AuthenticatedUser,
  ): Promise<ConfirmPaymentResult> {
    for (const line of dto.lines) {
      for (const method of line.methods) {
        await this.accountResolverService.assertAccountHasFlag(
          method.cashAccountId,
          'is_cash_account',
          'Kas/Bank',
        );
      }
    }

    // CASH_OUTFLOW (CLAUDE.md §5) — hanya arah PURCHASE (uang keluar). Dicek
    // DULU di luar transaction (pola sama operational-expenses.service.ts)
    // supaya authorization_requests baru tidak ikut rollback kalau 412
    // dilempar. Satu metode belum disetujui -> berhenti di situ; metode
    // berikutnya yang juga butuh approval baru kelihatan di percobaan retry
    // selanjutnya (payload {accountId, amount} per baris METODE, diindeks
    // lineIndex+methodIndex sejak metode pindah ke per baris faktur).
    const methodsNeedingApproval: {
      lineIndex: number;
      methodIndex: number;
      accountId: string;
      amount: number;
    }[] = [];
    if (dto.invoiceType === PaymentInvoiceType.PURCHASE) {
      const threshold = await this.readCashOutflowThreshold();
      for (let li = 0; li < dto.lines.length; li++) {
        const methods = dto.lines[li].methods;
        for (let mi = 0; mi < methods.length; mi++) {
          const method = methods[mi];
          const rows: { requires_outflow_approval: boolean }[] =
            await this.dataSource.query(
              `SELECT requires_outflow_approval FROM chart_of_accounts WHERE id = $1`,
              [method.cashAccountId],
            );
          if (rows[0]?.requires_outflow_approval && method.amount > threshold) {
            methodsNeedingApproval.push({
              lineIndex: li,
              methodIndex: mi,
              accountId: method.cashAccountId,
              amount: method.amount,
            });
            if (!method.authorizationRequestId) {
              await this.stepUpService.requireApproval({
                user,
                actionType: ActionType.CASH_OUTFLOW,
                payload: {
                  accountId: method.cashAccountId,
                  amount: method.amount,
                },
                contextSummary: `Pengeluaran Kas ${method.amount.toLocaleString('id-ID')} dari akun ${method.cashAccountId}`,
              });
            }
          }
        }
      }
    }

    return this.dataSource.transaction(async (manager) => {
      for (const pending of methodsNeedingApproval) {
        const method =
          dto.lines[pending.lineIndex].methods[pending.methodIndex];
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.CASH_OUTFLOW,
          payload: { accountId: pending.accountId, amount: pending.amount },
          contextSummary: `Pengeluaran Kas ${pending.amount.toLocaleString('id-ID')} dari akun ${pending.accountId}`,
          authorizationRequestId: method.authorizationRequestId,
          manager,
        });
      }

      const paymentDate = parseDateOnly(dto.paymentDate);
      const batchNumber = await this.documentCounterService.getNextNumber(
        'PAYMENT',
        paymentDate,
        manager,
      );

      // Total batch = Σ semua metode di semua baris faktur (tidak lagi
      // dicross-check terhadap "total baris" — baris SEKARANG didefinisikan
      // OLEH metodenya sendiri, bukan angka terpisah).
      const batchTotalCents = dto.lines.reduce(
        (sum, l) => sum + l.methods.reduce((s, m) => s + toCents(m.amount), 0),
        0,
      );

      const paymentBatch = await manager.save(
        PaymentBatch,
        manager.create(PaymentBatch, {
          batchNumber,
          paymentDate: dto.paymentDate,
          totalAmount: fromCents(batchTotalCents).toFixed(2),
          notes: dto.notes ?? null,
          createdBy: user.sub,
        }),
      );

      let apAccountId: string | null = null;
      if (dto.invoiceType === PaymentInvoiceType.PURCHASE) {
        apAccountId = await this.accountResolverService.resolveSingleActive(
          'is_payable_account = true',
          'Hutang Usaha',
          manager,
        );
      }

      const journalLines: PostJournalLineDto[] = [];
      const savedPayments: Payment[] = [];
      // Kas diagregasi per akun lintas SEMUA baris faktur -- satu baris
      // jurnal per akun kas/bank yang dipakai, bukan satu per baris metode
      // (mencegah jurnal membanjir kalau banyak faktur memakai akun yang sama).
      const cashCentsByAccount = new Map<string, number>();

      for (const line of dto.lines) {
        const lineCashCents = line.methods.reduce(
          (s, m) => s + toCents(m.amount),
          0,
        );

        const { outstandingCents } =
          await this.lockInvoiceAndGetOutstandingCents(
            dto.invoiceType,
            line.invoiceId,
            manager,
          );
        if (outstandingCents <= 0) {
          throw new BadRequestException(
            `Faktur ${line.invoiceId} sudah lunas — tidak ada sisa untuk dibayar.`,
          );
        }

        if (!line.settleInFull && lineCashCents > outstandingCents) {
          throw new BadRequestException(
            `Pembayaran (Rp ${fromCents(lineCashCents).toLocaleString('id-ID')}) melebihi sisa faktur (Rp ${fromCents(outstandingCents).toLocaleString('id-ID')}). Tandai lunas dulu kalau memang ingin menutupnya dengan selisih.`,
          );
        }

        const clearingCents = line.settleInFull
          ? outstandingCents
          : lineCashCents;
        const discrepancyCents = line.settleInFull
          ? outstandingCents - lineCashCents
          : 0;

        let customerId: string | null = null;
        let partyAccountId: string;
        if (dto.invoiceType === PaymentInvoiceType.SALES) {
          const invoiceRow: { customer_id: string }[] = await manager.query(
            `SELECT customer_id FROM sales_invoices WHERE id = $1`,
            [line.invoiceId],
          );
          customerId = invoiceRow[0].customer_id;
          const customer = await manager.findOne(Customer, {
            where: { id: customerId },
          });
          if (!customer) {
            throw new BadRequestException('Pelanggan tidak ditemukan.');
          }
          partyAccountId = await this.arAccountResolverService.resolve(
            customer,
            manager,
          );
          journalLines.push({
            accountId: partyAccountId,
            debit: 0,
            credit: fromCents(clearingCents),
            customerId,
            description: `Pelunasan faktur (batch ${batchNumber})`,
          });
        } else {
          partyAccountId = apAccountId as string;
          journalLines.push({
            accountId: partyAccountId,
            debit: fromCents(clearingCents),
            credit: 0,
            description: `Pelunasan faktur (batch ${batchNumber})`,
          });
        }

        if (discrepancyCents !== 0) {
          const diffAccountId =
            await this.accountResolverService.resolveSingleActive(
              'is_payment_diff_account = true',
              'Selisih Pembayaran',
              manager,
            );
          // SALES: diff>0 (kurang bayar) -> debit. PURCHASE: diff>0 (kita
          // bayar kurang) -> credit — polaritas terbalik karena Piutang
          // (aset) dan Hutang (kewajiban) ada di sisi neraca yang berlawanan
          // (lihat contoh 4-arah di CLAUDE.md §4 "Selisih Pembayaran").
          const isDebit =
            dto.invoiceType === PaymentInvoiceType.SALES
              ? discrepancyCents > 0
              : discrepancyCents < 0;
          const amountAbs = fromCents(Math.abs(discrepancyCents));
          journalLines.push({
            accountId: diffAccountId,
            debit: isDebit ? amountAbs : 0,
            credit: isDebit ? 0 : amountAbs,
            customerId,
            description: `Selisih pembayaran faktur (batch ${batchNumber})`,
          });
        }

        const flagged =
          !!line.settleInFull &&
          Math.abs(discrepancyCents) > DISCREPANCY_FLAG_THRESHOLD_CENTS;
        if (flagged) {
          const table =
            dto.invoiceType === PaymentInvoiceType.SALES
              ? SalesInvoice
              : PurchaseInvoice;
          await manager.update(table, line.invoiceId, {
            paymentDiscrepancyFlagged: true,
          });
        }

        const savedPayment = await manager.save(
          Payment,
          manager.create(Payment, {
            paymentBatchId: paymentBatch.id,
            invoiceType: dto.invoiceType,
            invoiceId: line.invoiceId,
            allocatedAmount: fromCents(clearingCents).toFixed(2),
            settledInFull: line.settleInFull ?? false,
            discrepancyAmount: fromCents(discrepancyCents).toFixed(2),
          }),
        );

        savedPayment.methods = await manager.save(
          PaymentMethod,
          line.methods.map((m) =>
            manager.create(PaymentMethod, {
              paymentId: savedPayment.id,
              cashAccountId: m.cashAccountId,
              amount: m.amount.toFixed(2),
            }),
          ),
        );
        savedPayments.push(savedPayment);

        for (const m of line.methods) {
          cashCentsByAccount.set(
            m.cashAccountId,
            (cashCentsByAccount.get(m.cashAccountId) ?? 0) + toCents(m.amount),
          );
        }
      }

      for (const [cashAccountId, cents] of cashCentsByAccount) {
        journalLines.push({
          accountId: cashAccountId,
          debit:
            dto.invoiceType === PaymentInvoiceType.SALES ? fromCents(cents) : 0,
          credit:
            dto.invoiceType === PaymentInvoiceType.PURCHASE
              ? fromCents(cents)
              : 0,
          description: `Pembayaran batch ${batchNumber}`,
        });
      }

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: paymentDate,
          description: dto.notes ?? `Payment batch ${batchNumber}`,
          sourceType: 'PAYMENT',
          sourceId: paymentBatch.id,
          lines: journalLines,
          createdBy: user.sub,
        },
        manager,
      );

      return {
        paymentBatch,
        payments: savedPayments,
        journalEntry,
      };
    });
  }

  /**
   * `POST /payments/:id/void` — VOID_DOCUMENT step-up untuk OPERATOR (CLAUDE.md
   * §2.13), pola PERSIS SalesInvoicesService.voidInvoice() minus gerbang
   * UNLOCK_PRINT (Payment belum ikut kunci cetak hari ini). Pembalikan jurnal
   * sungguhan ditangani generik oleh VoidEngineService — di sini hanya
   * menjaga gerbang step-up + efek samping spesifik Payment (reset flag
   * selisih) lewat PaymentBatchVoidHook.markVoided().
   */
  async voidBatch(
    id: string,
    dto: VoidPaymentDto,
    user: AuthenticatedUser,
    authorizationRequestId: string | undefined,
    voidAuthorizationRequestId: string | undefined,
  ): Promise<VoidPaymentResult> {
    const existingRows: { batch_number: string }[] =
      await this.dataSource.query(
        `SELECT batch_number FROM payment_batches WHERE id = $1`,
        [id],
      );
    if (existingRows.length === 0) {
      throw new BadRequestException('Batch pembayaran tidak ditemukan.');
    }
    const batchNumber = existingRows[0].batch_number;
    const unlockReason = dto.unlockReason ?? dto.reasonNote;

    // Gerbang 1: UNLOCK_PRINT (CLAUDE.md §2.16) — semua role, hanya kalau
    // batch sudah PRINTED. No-op kalau belum pernah dicetak.
    await this.printLockService.preflight({
      table: 'payment_batches',
      sourceType: 'PAYMENT',
      documentId: id,
      documentLabel: batchNumber,
      intent: 'VOID',
      reason: unlockReason,
      user,
      authorizationRequestId,
    });

    // Gerbang 2: VOID_DOCUMENT (CLAUDE.md §2.13) — HANYA OPERATOR, tidak
    // peduli status cetak. Dua gerbang independen, pola persis
    // SalesInvoicesService.voidInvoice().
    const isOperator = user.role === Role.OPERATOR;
    const voidPayload = { sourceType: 'PAYMENT', sourceId: id };
    const voidContextSummary = `VOID batch pembayaran ${batchNumber}: ${dto.reasonNote}`;

    if (isOperator && !voidAuthorizationRequestId) {
      await this.stepUpService.requireApproval({
        user,
        actionType: ActionType.VOID_DOCUMENT,
        payload: voidPayload,
        contextSummary: voidContextSummary,
      });
    }

    await this.dataSource.transaction(async (manager) => {
      await this.printLockService.consume({
        table: 'payment_batches',
        sourceType: 'PAYMENT',
        documentId: id,
        documentLabel: batchNumber,
        intent: 'VOID',
        reason: unlockReason,
        user,
        authorizationRequestId,
        manager,
      });

      if (isOperator) {
        await this.stepUpService.requireApproval({
          user,
          actionType: ActionType.VOID_DOCUMENT,
          payload: voidPayload,
          contextSummary: voidContextSummary,
          authorizationRequestId: voidAuthorizationRequestId,
          manager,
        });
      }

      await this.voidEngineService.voidDocument({
        sourceType: 'PAYMENT',
        sourceId: id,
        reasonCode: dto.reasonCode,
        reasonNote: dto.reasonNote,
        userId: user.sub,
        manager,
      });
    });

    const paymentBatch = await this.dataSource.manager.findOne(PaymentBatch, {
      where: { id },
    });
    if (!paymentBatch) {
      throw new BadRequestException('Batch pembayaran tidak ditemukan.');
    }
    return { paymentBatch };
  }

  /**
   * `GET /payments` (Hari 27 FE — "Riwayat Batch Pembayaran"). `payment_batches`
   * TIDAK punya kolom invoiceType/party sendiri (sengaja, §2.12) — keduanya
   * diturunkan lewat subquery ke `payments` + faktur terkait, bukan filter
   * langsung di header. `invoiceType` di sini murni untuk memisah tampilan
   * "Riwayat Penerimaan" vs "Riwayat Pengeluaran" (praktiknya satu batch
   * selalu satu arah, meski skema tidak memaksakannya).
   *
   * `partyNames` (paket R9, KB1) — batch sekarang bisa BENAR-BENAR lintas
   * banyak pihak (grid multi-baris di FE). Nama digabung ", " kalau jumlah
   * pihak berbeda <= 3, di atas itu diringkas "N pelanggan/supplier" lewat
   * `buildPartyLabel()` — daftar panjang di kolom riwayat tidak masuk akal
   * dibaca operator.
   */
  async findAll(
    query: PaymentQueryDto,
  ): Promise<PaginatedResult<PaymentListRow>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const params: unknown[] = [];
    const whereClauses: string[] = [];
    if (query.invoiceType) {
      params.push(query.invoiceType);
      whereClauses.push(
        `EXISTS (SELECT 1 FROM payments p WHERE p.payment_batch_id = pb.id AND p.invoice_type = $${params.length})`,
      );
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      whereClauses.push(`pb.batch_number ILIKE $${params.length}`);
    }
    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const countRows: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM payment_batches pb ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    params.push(limit, (page - 1) * limit);
    const rows: {
      id: string;
      batch_number: string;
      payment_date: string;
      total_amount: string;
      posting_status: string;
      print_status: string;
      created_at: string;
      invoice_type: PaymentInvoiceType | null;
      party_names: string | null;
      party_count: string;
    }[] = await this.dataSource.query(
      `SELECT pb.id, pb.batch_number, pb.payment_date, pb.total_amount,
              pb.posting_status, pb.print_status, pb.created_at,
              (SELECT p.invoice_type FROM payments p WHERE p.payment_batch_id = pb.id LIMIT 1) AS invoice_type,
              (SELECT string_agg(DISTINCT COALESCE(cust.name, sup.name), ', ')
               FROM payments p
               LEFT JOIN sales_invoices si ON p.invoice_type = 'SALES' AND si.id = p.invoice_id
               LEFT JOIN customers cust ON cust.id = si.customer_id
               LEFT JOIN purchase_invoices pi ON p.invoice_type = 'PURCHASE' AND pi.id = p.invoice_id
               LEFT JOIN suppliers sup ON sup.id = pi.supplier_id
               WHERE p.payment_batch_id = pb.id) AS party_names,
              (SELECT COUNT(DISTINCT COALESCE(cust.id, sup.id))
               FROM payments p
               LEFT JOIN sales_invoices si ON p.invoice_type = 'SALES' AND si.id = p.invoice_id
               LEFT JOIN customers cust ON cust.id = si.customer_id
               LEFT JOIN purchase_invoices pi ON p.invoice_type = 'PURCHASE' AND pi.id = p.invoice_id
               LEFT JOIN suppliers sup ON sup.id = pi.supplier_id
               WHERE p.payment_batch_id = pb.id)::int AS party_count
       FROM payment_batches pb
       ${whereSql}
       ORDER BY pb.payment_date DESC, pb.batch_number DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const data: PaymentListRow[] = rows.map((r) => ({
      id: r.id,
      batchNumber: r.batch_number,
      paymentDate: r.payment_date,
      totalAmount: Number(r.total_amount),
      postingStatus: r.posting_status,
      printStatus: r.print_status,
      createdAt: r.created_at,
      invoiceType: r.invoice_type,
      partyNames: buildPartyLabel(
        r.party_names,
        Number(r.party_count),
        r.invoice_type,
      ),
    }));
    return buildPaginatedResult(data, total, page, limit);
  }

  /**
   * `GET /payments/:id` — detail lengkap (header + baris + metode PER BARIS,
   * koreksi 26 Sep 2026) untuk layar Riwayat/cetak kwitansi. Nomor faktur &
   * nama party di-resolve di sini (bukan disimpan redundan di `payments`)
   * karena hanya dibutuhkan saat ditampilkan, bukan jalur panas seperti
   * price-suggestion. `methodsSummary` (agregat GROUP BY akun lintas semua
   * baris) dihitung di JS dari query yang sama — dipakai overview "Metode
   * Pembayaran" + kaki kwitansi, TIDAK menyimpan agregat itu di DB mana pun.
   */
  async findOne(id: string): Promise<PaymentDetailResult> {
    const batch = await this.dataSource.manager.findOne(PaymentBatch, {
      where: { id },
    });
    if (!batch) {
      throw new BadRequestException('Batch pembayaran tidak ditemukan.');
    }

    const methodRows: {
      id: string;
      payment_id: string;
      cash_account_id: string;
      amount: string;
      code: string;
      name: string;
    }[] = await this.dataSource.query(
      `SELECT pm.id, pm.payment_id, pm.cash_account_id, pm.amount, coa.code, coa.name
       FROM payment_methods pm
       JOIN payments p ON p.id = pm.payment_id
       JOIN chart_of_accounts coa ON coa.id = pm.cash_account_id
       WHERE p.payment_batch_id = $1
       ORDER BY pm.created_at ASC`,
      [id],
    );

    const methodsByPaymentId = new Map<string, PaymentDetailMethod[]>();
    const summaryByAccount = new Map<string, PaymentDetailMethod>();
    for (const r of methodRows) {
      const amount = Number(r.amount);
      const list = methodsByPaymentId.get(r.payment_id) ?? [];
      list.push({
        id: r.id,
        cashAccountId: r.cash_account_id,
        cashAccountCode: r.code,
        cashAccountName: r.name,
        amount,
      });
      methodsByPaymentId.set(r.payment_id, list);

      const existing = summaryByAccount.get(r.cash_account_id);
      if (existing) {
        existing.amount += amount;
      } else {
        summaryByAccount.set(r.cash_account_id, {
          id: r.cash_account_id,
          cashAccountId: r.cash_account_id,
          cashAccountCode: r.code,
          cashAccountName: r.name,
          amount,
        });
      }
    }

    const lineRows: {
      id: string;
      invoice_type: PaymentInvoiceType;
      invoice_id: string;
      allocated_amount: string;
      settled_in_full: boolean;
      discrepancy_amount: string;
      invoice_number: string | null;
      party_name: string | null;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.invoice_type, p.invoice_id, p.allocated_amount,
              p.settled_in_full, p.discrepancy_amount,
              COALESCE(si.invoice_number, pi.invoice_number) AS invoice_number,
              COALESCE(cust.name, sup.name) AS party_name
       FROM payments p
       LEFT JOIN sales_invoices si ON p.invoice_type = 'SALES' AND si.id = p.invoice_id
       LEFT JOIN customers cust ON cust.id = si.customer_id
       LEFT JOIN purchase_invoices pi ON p.invoice_type = 'PURCHASE' AND pi.id = p.invoice_id
       LEFT JOIN suppliers sup ON sup.id = pi.supplier_id
       WHERE p.payment_batch_id = $1`,
      [id],
    );

    return {
      paymentBatch: batch,
      methodsSummary: [...summaryByAccount.values()],
      lines: lineRows.map((r) => ({
        id: r.id,
        invoiceType: r.invoice_type,
        invoiceId: r.invoice_id,
        invoiceNumber: r.invoice_number ?? '-',
        partyName: r.party_name ?? '-',
        allocatedAmount: Number(r.allocated_amount),
        settledInFull: r.settled_in_full,
        discrepancyAmount: Number(r.discrepancy_amount),
        methods: methodsByPaymentId.get(r.id) ?? [],
      })),
    };
  }

  /**
   * Cetak kwitansi A5 (Hari 27 FE) — cetak ulang identik bebas tanpa izin
   * (CLAUDE.md §2.16), pola sama `registerPrint()` modul dokumen lain.
   */
  async registerPrint(id: string): Promise<PaymentDetailResult> {
    await this.printLockService.registerPrint({
      table: 'payment_batches',
      sourceType: 'PAYMENT',
      documentId: id,
    });
    return this.findOne(id);
  }
}

// Batch multi-pihak (paket R9, KB1) — daftar nama digabung ", " selama masih
// sedikit; di atas ambang, panjangnya tidak lagi masuk akal dibaca di kolom
// riwayat, jadi diringkas jadi hitungan. Ambang 3 dipilih sama seperti pola
// "3 baris atau ringkas" yang dipakai layar lain (bukan aturan CLAUDE.md).
const PARTY_LABEL_JOIN_THRESHOLD = 3;

function buildPartyLabel(
  partyNames: string | null,
  partyCount: number,
  invoiceType: PaymentInvoiceType | null,
): string | null {
  if (!partyNames || partyCount <= 0) {
    return partyNames;
  }
  if (partyCount <= PARTY_LABEL_JOIN_THRESHOLD) {
    return partyNames;
  }
  const noun =
    invoiceType === PaymentInvoiceType.PURCHASE ? 'supplier' : 'pelanggan';
  return `${partyCount} ${noun}`;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
