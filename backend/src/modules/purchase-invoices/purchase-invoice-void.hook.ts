import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockRecorderService } from '../../core/stock-recorder/stock-recorder.service';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  PurchaseInvoice,
  PurchaseInvoicePostingStatus,
} from './entities/purchase-invoice.entity';

/**
 * Self-registers ke VoidEngineService (pola OnModuleInit — belum ada contoh
 * hook sungguhan sebelum ini, GD Hari 13 sengaja belum implementasi VOID).
 * Modul dokumen lain (Hari 16+) mengikuti pola yang sama begitu tabelnya ada.
 */
@Injectable()
export class PurchaseInvoiceVoidHook implements VoidHook, OnModuleInit {
  constructor(
    private readonly voidEngineService: VoidEngineService,
    private readonly stockRecorderService: StockRecorderService,
  ) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('PURCHASE_INVOICE', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    await this.stockRecorderService.assertLotsUnconsumed(
      'PURCHASE_INVOICE',
      sourceId,
      manager,
      'Barang dari faktur ini sudah terjual. Buat retur pembelian, bukan pembatalan.',
    );
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(PurchaseInvoice, sourceId, {
      postingStatus: PurchaseInvoicePostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
