import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  SalesInvoice,
  SalesInvoicePostingStatus,
} from './entities/sales-invoice.entity';

/**
 * Self-registers ke VoidEngineService, pola sama PurchaseInvoiceVoidHook.
 * checkVoidable() SENGAJA no-op (pola sama OperationalExpenseVoidHook) —
 * faktur penjualan HANYA mengonsumsi lot lewat StockRecorderService.recordOut()
 * (stock_cost_consumptions), tidak pernah membuat baris stock_cost_lots sendiri
 * seperti faktur pembelian. assertLotsUnconsumed('SALES_INVOICE', ...) akan
 * SELALU lolos vacuous karena tidak ada lot ber-source_type SALES_INVOICE —
 * memanggilnya di sini hanya akan menyesatkan pembaca berikutnya seolah ada
 * gerbang sungguhan. Reversal stok sudah generik lewat
 * StockRecorderService.reverseOut() (dipanggil VoidEngineService), tidak ada
 * kode reversal baru di sini.
 */
@Injectable()
export class SalesInvoiceVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('SALES_INVOICE', this);
  }

  async checkVoidable(): Promise<void> {
    // Tidak ada apa pun untuk diperiksa — lihat komentar kelas di atas.
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(SalesInvoice, sourceId, {
      postingStatus: SalesInvoicePostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
