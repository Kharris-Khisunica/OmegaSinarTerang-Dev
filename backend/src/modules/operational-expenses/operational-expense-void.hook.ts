import { Injectable, OnModuleInit } from '@nestjs/common';
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
 * .entity.ts). checkVoidable() no-op: baris biaya tidak menyentuh stok/lot
 * apa pun, tidak ada state gantung untuk diperiksa.
 */
@Injectable()
export class OperationalExpenseVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('OPERATIONAL_EXPENSE', this);
  }

  async checkVoidable(): Promise<void> {
    // Tidak ada apa pun untuk diperiksa — no-op disengaja.
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
