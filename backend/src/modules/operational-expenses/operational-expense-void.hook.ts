import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  OperationalExpenseLine,
  OperationalExpenseLinePostingStatus,
} from './entities/operational-expense-line.entity';

/**
 * Self-registers ke VoidEngineService (pola sama PurchaseInvoiceVoidHook,
 * Hari 11). sourceId di sini adalah operational_expense_lines.id (VOID per
 * BARIS, bukan per header/hari — lihat catatan di operational-expense-line
 * .entity.ts). Baris biaya tidak menyentuh stok/lot apa pun. Satu-satunya
 * prasyarat (need_fixing.md #26): baris KASBON tidak boleh di-VOID kalau
 * membuat sisa kasbon pekerjanya minus (sudah dilunasi lewat Pelunasan
 * Kasbon) — VOID pelunasannya dulu.
 */
@Injectable()
export class OperationalExpenseVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('OPERATIONAL_EXPENSE', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    const rows: { worker_id: string; amount: string; outstanding: string }[] =
      await manager.query(
        `SELECT oel.worker_id, oel.amount,
                (SELECT COALESCE(SUM(l.amount), 0)
                   FROM operational_expense_lines l
                   JOIN chart_of_accounts c ON c.id = l.expense_account_id
                  WHERE l.worker_id = oel.worker_id AND l.posting_status = 'POSTED'
                    AND c.is_employee_receivable_account = true)
                - (SELECT COALESCE(SUM(r.amount), 0)
                     FROM kasbon_repayments r
                    WHERE r.worker_id = oel.worker_id AND r.posting_status = 'POSTED')
                  AS outstanding
           FROM operational_expense_lines oel
           JOIN chart_of_accounts coa ON coa.id = oel.expense_account_id
          WHERE oel.id = $1 AND oel.worker_id IS NOT NULL
            AND coa.is_employee_receivable_account = true`,
        [sourceId],
      );
    const row = rows[0];
    if (!row) return; // bukan baris kasbon ber-pekerja
    const after =
      Math.round(Number(row.outstanding) * 100) -
      Math.round(Number(row.amount) * 100);
    if (after < 0) {
      throw new BadRequestException(
        'Kasbon ini sudah (sebagian) dilunasi — VOID dulu Pelunasan Kasbon terkait sebelum mem-VOID baris kasbon.',
      );
    }
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(OperationalExpenseLine, sourceId, {
      postingStatus: OperationalExpenseLinePostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
