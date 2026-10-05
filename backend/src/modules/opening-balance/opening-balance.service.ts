import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AccountResolverService } from '../../core/account-resolver/account-resolver.service';
import { PostJournalLineDto } from '../../core/journal-poster/dto/post-journal.dto';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { ArAccountResolverService } from '../../core/receivables/ar-account-resolver.service';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { Customer } from '../customers/entities/customer.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import {
  StockMovement,
  StockMovementType,
} from '../stock/entities/stock-movement.entity';
import { SubmitOpeningBalanceDto } from './dto/submit-opening-balance.dto';

export interface OpeningBalanceSubmitResult {
  stockMovements: StockMovement[];
  journalEntry: JournalEntry;
}

export interface OpeningBalanceVerifyResult {
  lotValue: number;
  ledgerValue: number;
  difference: number;
}

/**
 * Saldo Awal terpadu (CLAUDE.md §3 "Saldo Awal", §0): satu alur yang
 * menghasilkan lot stok DAN jurnal pembuka dari angka yang sama, lewat
 * StockRecorderService dan JournalPosterService yang SAMA dengan transaksi
 * biasa — tidak ada jalur tulis-langsung-ke-tabel. Selisih Debit(Persediaan
 * +Piutang) vs Kredit(Hutang) di-plug otomatis ke akun Modal (EQUITY),
 * pola akuntansi standar jurnal pembuka (dikonfirmasi user).
 *
 * Bentuk layar/impor file MASIH PR TERBUKA (KONTEKS_REVISI §4.1) — endpoint
 * ini menerima array baris lewat JSON body biasa, bukan upload file.
 */
@Injectable()
export class OpeningBalanceService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly stockRecorderService: StockRecorderService,
    private readonly journalPosterService: JournalPosterService,
    private readonly arAccountResolverService: ArAccountResolverService,
    private readonly periodLockValidatorService: PeriodLockValidatorService,
    private readonly accountResolverService: AccountResolverService,
  ) {}

  async submit(
    dto: SubmitOpeningBalanceDto,
    userId: string,
  ): Promise<OpeningBalanceSubmitResult> {
    const stockLines = dto.stockLines ?? [];
    const receivableLines = dto.receivableLines ?? [];
    const payableLines = dto.payableLines ?? [];
    if (
      stockLines.length === 0 &&
      receivableLines.length === 0 &&
      payableLines.length === 0
    ) {
      throw new BadRequestException(
        'Saldo awal butuh minimal satu baris (stok, piutang, atau hutang).',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const openingDate = await this.resolveOpeningDate(manager);
      // Pengecualian bernama satu-satunya (CLAUDE.md §2.9/§3) — dipanggil
      // eksplisit di sini, tidak pernah lewat JournalPosterService.post().
      await this.periodLockValidatorService.assertOpeningBalanceDate(
        openingDate,
        manager,
      );

      const stockMovements: StockMovement[] = [];
      for (const line of stockLines) {
        const movement = await this.stockRecorderService.recordIn(
          {
            productId: line.productId,
            warehouseId: line.warehouseId,
            qtyBaseUnit: line.qtyBaseUnit,
            unitCost: line.unitCost,
            lotDate: openingDate,
            movementDate: openingDate,
            movementType: StockMovementType.OPENING,
            sourceType: 'OPENING_BALANCE',
            createdBy: userId,
          },
          manager,
        );
        stockMovements.push(movement);
      }

      const journalLines: PostJournalLineDto[] = [];
      let totalDebitCents = 0;
      let totalCreditCents = 0;

      const stockValue = roundToCents(
        stockLines.reduce(
          (sum, line) => sum + line.qtyBaseUnit * line.unitCost,
          0,
        ),
      );
      if (stockValue > 0) {
        const inventoryAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_inventory_account = true',
            'Persediaan',
            manager,
          );
        journalLines.push({
          accountId: inventoryAccountId,
          debit: stockValue,
          credit: 0,
          description: 'Saldo awal persediaan',
        });
        totalDebitCents += Math.round(stockValue * 100);
      }

      for (const line of receivableLines) {
        const customer = await manager.findOne(Customer, {
          where: { id: line.customerId },
        });
        if (!customer) {
          throw new BadRequestException(
            `Pelanggan ${line.customerId} tidak ditemukan.`,
          );
        }
        const arAccountId = await this.arAccountResolverService.resolve(
          { arAccountId: customer.arAccountId },
          manager,
        );
        const amount = roundToCents(line.amount);
        journalLines.push({
          accountId: arAccountId,
          debit: amount,
          credit: 0,
          description:
            line.description ?? `Saldo awal piutang ${customer.name}`,
          // Hari 18 — invarian customerId (lihat ar-account-resolver.service.ts):
          // ini SATU-SATUNYA baris yang mencatat berapa saldo piutang milik
          // pelanggan ini, karena baris jurnal di atas hanya membawa total per
          // akun. Tanpa ini, ArAccountResolverService.getCustomerBalance()
          // tidak bisa membedakan piutang pelanggan A dari pelanggan B.
          customerId: customer.id,
        });
        totalDebitCents += Math.round(amount * 100);
      }

      let payableAccountId: string | null = null;
      if (payableLines.length > 0) {
        payableAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_payable_account = true',
            'Hutang Usaha',
            manager,
          );
      }
      for (const line of payableLines) {
        const supplier = await manager.findOne(Supplier, {
          where: { id: line.supplierId },
        });
        if (!supplier) {
          throw new BadRequestException(
            `Supplier ${line.supplierId} tidak ditemukan.`,
          );
        }
        const amount = roundToCents(line.amount);
        journalLines.push({
          accountId: payableAccountId as string,
          debit: 0,
          credit: amount,
          description: line.description ?? `Saldo awal hutang ${supplier.name}`,
        });
        totalCreditCents += Math.round(amount * 100);
      }

      const diffCents = totalDebitCents - totalCreditCents;
      if (diffCents !== 0) {
        // Plug otomatis ke akun Modal — dikonfirmasi user, pola akuntansi
        // standar untuk jurnal pembuka. Diresolve lewat flag
        // is_opening_balance_equity_account, BUKAN account_type = 'EQUITY'
        // (Hari 17A, COA_USULAN §7.2): bagan baru punya lima akun EQUITY
        // aktif (Modal Pemilik, Prive, Laba Ditahan, Laba Tahun Berjalan,
        // Ikhtisar Laba Rugi), jadi resolveSingleActive() akan menemukan
        // lebih dari satu baris dan melempar error kalau masih memakai
        // account_type.
        const equityAccountId =
          await this.accountResolverService.resolveSingleActive(
            'is_opening_balance_equity_account = true',
            'Modal (penyeimbang saldo awal)',
            manager,
          );
        const plugAmount = Math.abs(diffCents) / 100;
        if (diffCents > 0) {
          journalLines.push({
            accountId: equityAccountId,
            debit: 0,
            credit: plugAmount,
            description: 'Saldo awal — penyeimbang Modal',
          });
        } else {
          journalLines.push({
            accountId: equityAccountId,
            debit: plugAmount,
            credit: 0,
            description: 'Saldo awal — penyeimbang Modal',
          });
        }
      }

      const journalEntry = await this.journalPosterService.post(
        {
          entryDate: openingDate,
          description: 'Saldo Awal',
          sourceType: 'OPENING_BALANCE',
          sourceId: null,
          createdBy: userId,
          lines: journalLines,
        },
        manager,
      );

      return { stockMovements, journalEntry };
    });
  }

  /**
   * Cek sanity SEKALI SAAT INPUT (Hari 36), bukan invarian hidup selamanya —
   * di-scope ke source_type='OPENING_BALANCE' di kedua sisi sesuai tugas
   * ("Σ nilai lot pembuka" vs "saldo akun Persediaan hasil jurnal pembuka").
   * Begitu stok pembuka mulai laku terjual pasca cut-over, qty_remaining lot
   * pembuka turun sementara baris jurnal pembuka tidak berubah (penurunannya
   * dicatat jurnal SALES_INVOICE terpisah) — selisih akan muncul dan itu
   * DIHARAPKAN, bukan bug. Invarian yang berlaku selamanya (Σ SEMUA lot vs
   * SELURUH saldo akun Persediaan) sudah ada terpisah sebagai invarian ke-5
   * Hari 11 (five-invariants.spec.ts) dan tidak diduplikasi di sini.
   */
  async verify(): Promise<OpeningBalanceVerifyResult> {
    const manager = this.dataSource.manager;
    const inventoryAccountId =
      await this.accountResolverService.resolveSingleActive(
        'is_inventory_account = true',
        'Persediaan',
        manager,
      );

    const lotRows: { total: string | null }[] = await manager.query(
      `SELECT SUM(qty_remaining * unit_cost) AS total FROM stock_cost_lots
       WHERE source_type = 'OPENING_BALANCE'`,
    );
    const lotValue = Number(lotRows[0]?.total ?? 0);

    const ledgerRows: { total: string | null }[] = await manager.query(
      `SELECT SUM(debit_amount - credit_amount) AS total
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       WHERE je.source_type = 'OPENING_BALANCE' AND jel.account_id = $1`,
      [inventoryAccountId],
    );
    const ledgerValue = Number(ledgerRows[0]?.total ?? 0);

    return {
      lotValue,
      ledgerValue,
      difference: Number((lotValue - ledgerValue).toFixed(4)),
    };
  }

  private async resolveOpeningDate(manager: EntityManager): Promise<Date> {
    const rows: { value: string }[] = await manager.query(
      `SELECT value FROM settings WHERE key = 'opening_balance_date'`,
    );
    const raw = rows[0]?.value;
    if (!raw) {
      throw new BadRequestException(
        'settings.opening_balance_date belum diisi — tidak bisa memproses saldo awal.',
      );
    }
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}
