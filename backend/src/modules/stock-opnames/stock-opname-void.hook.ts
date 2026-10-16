import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import { StockOpname, StockOpnameStatus } from './entities/stock-opname.entity';

/**
 * need_fixing.md #25 — VOID stok opname POSTED (yang punya jurnal). Lot
 * "stok lebih" yang dibuat opname ini tidak boleh sudah terjual — pola sama
 * PurchaseInvoiceVoidHook.
 */
@Injectable()
export class StockOpnameVoidHook implements VoidHook, OnModuleInit {
  constructor(
    private readonly voidEngineService: VoidEngineService,
    private readonly stockRecorderService: StockRecorderService,
  ) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('STOCK_OPNAME', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    await this.stockRecorderService.assertLotsUnconsumed(
      'STOCK_OPNAME',
      sourceId,
      manager,
      'Barang lebih dari opname ini sudah terjual — tidak bisa dibatalkan.',
    );
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(StockOpname, sourceId, {
      status: StockOpnameStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
