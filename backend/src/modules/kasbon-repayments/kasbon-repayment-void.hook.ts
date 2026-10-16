import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VoidHook } from '../../core/void/void-hook.interface';
import { VoidEngineService } from '../../core/void/void.service';
import {
  KasbonRepayment,
  KasbonRepaymentPostingStatus,
} from './entities/kasbon-repayment.entity';

/** Self-registers ke VoidEngineService, pola sama CashTransferVoidHook. */
@Injectable()
export class KasbonRepaymentVoidHook implements VoidHook, OnModuleInit {
  constructor(private readonly voidEngineService: VoidEngineService) {}

  onModuleInit(): void {
    this.voidEngineService.registerHook('KASBON_REPAYMENT', this);
  }

  async checkVoidable(sourceId: string, manager: EntityManager): Promise<void> {
    const row = await manager.findOne(KasbonRepayment, {
      where: { id: sourceId },
    });
    if (!row) {
      throw new NotFoundException('Pelunasan kasbon tidak ditemukan.');
    }
  }

  async markVoided(
    sourceId: string,
    reasonCode: string,
    reasonNote: string,
    _userId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(KasbonRepayment, sourceId, {
      postingStatus: KasbonRepaymentPostingStatus.VOIDED,
      voidReasonCode: reasonCode,
      voidReasonNote: reasonNote,
    });
  }
}
