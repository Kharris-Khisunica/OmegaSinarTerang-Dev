import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import { PurchaseInvoice } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SalesInvoice } from '../sales-invoices/entities/sales-invoice.entity';
import {
  PaymentBatch,
  PaymentBatchPostingStatus,
} from './entities/payment-batch.entity';
import { Payment, PaymentInvoiceType } from './entities/payment.entity';

const DISCREPANCY_FLAG_THRESHOLD_CENTS = 1_000_000;

/**
 * Self-registers ke VoidEngineService (Hari 27) — pola sama
 * PurchaseInvoiceVoidHook/SalesInvoiceVoidHook. Pembalikan jurnal sungguhan
 * (Kas/Piutang-Hutang/Selisih Pembayaran) ditangani generik oleh
 * VoidEngineService lewat journal_entries asli (sourceType='PAYMENT') —
 * markVoided() di sini hanya menangani efek samping yang KHUSUS Payment dan
 * tidak diketahui VoidEngineService: menandai batch VOIDED, dan me-reset
 * payment_discrepancy_flagged pada faktur yang tadinya ditandai oleh baris
 * payments batch ini (CLAUDE.md §2.18) — selisih yang dibatalkan tidak boleh
 * terus tertinggal sebagai tanda di layar pengecekan supervisor.
 */
@Injectable()
export class PaymentBatchVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('PAYMENT', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    const batch = await manager.findOne(PaymentBatch, {
      where: { id: sourceId },
    });
    if (!batch) {
      throw new NotFoundException('Batch pembayaran tidak ditemukan.');
    }
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(PaymentBatch, sourceId, {
      postingStatus: PaymentBatchPostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });

    const lines = await manager.find(Payment, {
      where: { paymentBatchId: sourceId },
    });
    for (const line of lines) {
      const discrepancyCents = Math.round(Number(line.discrepancyAmount) * 100);
      if (
        line.settledInFull &&
        Math.abs(discrepancyCents) > DISCREPANCY_FLAG_THRESHOLD_CENTS
      ) {
        const table =
          line.invoiceType === PaymentInvoiceType.SALES
            ? SalesInvoice
            : PurchaseInvoice;
        await manager.update(table, line.invoiceId, {
          paymentDiscrepancyFlagged: false,
        });
      }
    }
  }
}
