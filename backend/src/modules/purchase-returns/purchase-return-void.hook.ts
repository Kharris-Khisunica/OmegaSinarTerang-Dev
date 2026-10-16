import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  PurchaseReturn,
  PurchaseReturnPostingStatus,
} from './entities/purchase-return.entity';

/**
 * need_fixing.md #19 — VOID Retur Pembelian. Barang keluar dari BAD_STOCK
 * (recordOut) dikembalikan ke lot asal lewat reverseOut — selalu bisa, jadi
 * tidak ada prasyarat stok; cukup pastikan dokumennya ada.
 */
@Injectable()
export class PurchaseReturnVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('PURCHASE_RETURN', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    const row = await manager.findOne(PurchaseReturn, {
      where: { id: sourceId },
    });
    if (!row) {
      throw new NotFoundException('Retur pembelian tidak ditemukan.');
    }
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(PurchaseReturn, sourceId, {
      postingStatus: PurchaseReturnPostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
