import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  SalesReturn,
  SalesReturnPostingStatus,
} from './entities/sales-return.entity';

/**
 * need_fixing.md #19 — VOID Retur Penjualan. Barang retur masuk BAD_STOCK
 * sebagai lot baru; kalau lot itu sudah terpakai (diretur ke supplier lewat
 * RB atau dipindah BS -> STORE), VOID ditolak — pola sama
 * PurchaseInvoiceVoidHook.
 */
@Injectable()
export class SalesReturnVoidHook implements VoidHook, OnModuleInit {
  constructor(
    private readonly voidEngineService: VoidEngineService,
    private readonly stockRecorderService: StockRecorderService,
  ) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('SALES_RETURN', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    await this.stockRecorderService.assertLotsUnconsumed(
      'SALES_RETURN',
      sourceId,
      manager,
      'Barang dari retur ini sudah keluar dari Bad Stock (diretur ke supplier/dipindah) — tidak bisa di-VOID.',
    );
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(SalesReturn, sourceId, {
      postingStatus: SalesReturnPostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
