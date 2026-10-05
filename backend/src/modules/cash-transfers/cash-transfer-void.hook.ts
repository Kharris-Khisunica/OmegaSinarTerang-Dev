import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  CashTransfer,
  CashTransferPostingStatus,
} from './entities/cash-transfer.entity';

/**
 * Self-registers ke VoidEngineService (pola sama PaymentBatchVoidHook).
 * checkVoidable() hanya memastikan dokumennya ada — cash_transfers tidak
 * menyentuh stok/lot apa pun, dan tidak ikut kunci cetak §2.16, jadi tidak
 * ada prasyarat modul-spesifik lain untuk diperiksa.
 */
@Injectable()
export class CashTransferVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('CASH_TRANSFER', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    const transfer = await manager.findOne(CashTransfer, {
      where: { id: sourceId },
    });
    if (!transfer) {
      throw new NotFoundException('Pindah Buku Kas tidak ditemukan.');
    }
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(CashTransfer, sourceId, {
      postingStatus: CashTransferPostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
