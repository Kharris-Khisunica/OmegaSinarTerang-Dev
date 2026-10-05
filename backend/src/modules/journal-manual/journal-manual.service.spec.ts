import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { DocumentCounterService } from '../../core/document-counter/document-counter.service';
import { JournalPosterService } from '../../core/journal-poster/journal-poster.service';
import { PeriodLockValidatorService } from '../../core/period-lock/period-lock-validator.service';
import { ChartOfAccount } from '../chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntryLine } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entries/entities/journal-entry.entity';
import { User } from '../users/entities/user.entity';
import { PostManualJournalDto } from './dto/post-manual-journal.dto';
import { JournalManualService } from './journal-manual.service';

/**
 * Integration test terhadap Postgres asli, pola sama
 * journal-poster.service.spec.ts — service dikonstruksi manual lewat `new`.
 */
describe('JournalManualService', () => {
  let dataSource: DataSource;
  let service: JournalManualService;

  let userId: string;
  let persediaanAccountId: string; // 01.130.00001 — restricted
  let piutangAccountId: string; // 01.120.00001 — restricted
  let hutangAccountId: string; // 02.110.00001 — restricted
  let biayaOperasionalAccountId: string; // 06.120.00099 — bebas
  let modalAccountId: string; // 03.110.00001 — bebas

  const createdEntryIds: string[] = [];

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'omega_dev',
      entities: [User, ChartOfAccount, JournalEntry, JournalEntryLine],
    });
    await dataSource.initialize();

    const journalPosterService = new JournalPosterService(
      new DocumentCounterService(),
      new PeriodLockValidatorService(),
    );
    service = new JournalManualService(dataSource, journalPosterService);

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_journal_manual_${Date.now()}`,
        passwordHash,
        fullName: 'Test Journal Manual',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    const [persediaan, piutang, hutang, biayaOperasional, modal] =
      await Promise.all([
        accountsRepo.findOneOrFail({ where: { code: '01.130.00001' } }),
        accountsRepo.findOneOrFail({ where: { code: '01.120.00001' } }),
        accountsRepo.findOneOrFail({ where: { code: '02.110.00001' } }),
        accountsRepo.findOneOrFail({ where: { code: '06.120.00099' } }),
        accountsRepo.findOneOrFail({ where: { code: '03.110.00001' } }),
      ]);
    persediaanAccountId = persediaan.id;
    piutangAccountId = piutang.id;
    hutangAccountId = hutang.id;
    biayaOperasionalAccountId = biayaOperasional.id;
    modalAccountId = modal.id;
  });

  afterAll(async () => {
    if (createdEntryIds.length > 0) {
      await dataSource.query('DELETE FROM journal_entries WHERE id = ANY($1)', [
        createdEntryIds,
      ]);
    }
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

  function dto(
    overrides: Partial<PostManualJournalDto> = {},
  ): PostManualJournalDto {
    return {
      entryDate: new Date().toISOString().slice(0, 10),
      description: 'Uji Jurnal Manual',
      lines: [
        { accountId: biayaOperasionalAccountId, debit: 50_000, credit: 0 },
        { accountId: modalAccountId, debit: 0, credit: 50_000 },
      ],
      ...overrides,
    };
  }

  it('baris ke akun Persediaan -> 403 dengan pesan yang menjelaskan kenapa', async () => {
    const request = dto({
      lines: [
        { accountId: persediaanAccountId, debit: 50_000, credit: 0 },
        { accountId: modalAccountId, debit: 0, credit: 50_000 },
      ],
    });

    await expect(service.postManual(request, userId)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.postManual(request, userId)).rejects.toThrow(
      /sub-ledger/i,
    );
  });

  it('baris ke akun Piutang -> 403', async () => {
    const request = dto({
      lines: [
        { accountId: piutangAccountId, debit: 50_000, credit: 0 },
        { accountId: modalAccountId, debit: 0, credit: 50_000 },
      ],
    });

    await expect(service.postManual(request, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('baris ke akun Hutang -> 403', async () => {
    const request = dto({
      lines: [
        { accountId: modalAccountId, debit: 50_000, credit: 0 },
        { accountId: hutangAccountId, debit: 0, credit: 50_000 },
      ],
    });

    await expect(service.postManual(request, userId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('baris ke akun biasa (Biaya Operasional vs Modal) -> sukses, sourceType MANUAL', async () => {
    const request = dto();

    const result = await service.postManual(request, userId);
    createdEntryIds.push(result.id);

    expect(result.sourceType).toBe('MANUAL');
    expect(result.lines).toHaveLength(2);
  });
});
