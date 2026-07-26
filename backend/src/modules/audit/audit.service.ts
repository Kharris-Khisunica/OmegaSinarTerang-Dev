import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { stripSecrets } from './strip-secrets';

export interface RecordAuditInput {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    const entry = this.auditLogRepository.create({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      beforeData: input.before ? stripSecrets(input.before) : null,
      afterData: input.after ? stripSecrets(input.after) : null,
      ip: input.ip ?? null,
    });

    await this.auditLogRepository.save(entry);
  }
}
