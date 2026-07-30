import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import {
  AccountType,
  ChartOfAccount,
} from '../../modules/chart-of-accounts/entities/chart-of-account.entity';
import { JournalEntryLine } from '../../modules/journal-entries/entities/journal-entry-line.entity';
import { JournalEntry } from '../../modules/journal-entries/entities/journal-entry.entity';
import { User } from '../../modules/users/entities/user.entity';
import { DocumentCounterService } from '../document-counter/document-counter.service';
import { PostJournalDto } from './dto/post-journal.dto';
import { JournalPosterService } from './journal-poster.service';

/**
 * Integration test terhadap Postgres asli (pola sama dengan
 * document-counter.service.spec.ts) — JournalPosterService dites langsung
 * lewat `new` (tanpa Nest app), karena satu-satunya dependency-nya
 * (DocumentCounterService) juga stateless dan bisa `new` langsung.
 */
describe('JournalPosterService', () => {
  let dataSource: DataSource;
  let service: JournalPosterService;

  let userId: string;
  let persediaanAccountId: string; // kode 1101, ASSET, aktif (seed migration)
  let pendapatanAccountId: string; // kode 4101, INCOME, aktif (seed migration)
  let inactiveAccountId: string;

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
    service = new JournalPosterService(new DocumentCounterService());

    const usersRepo = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash('test-password', 4);
    const user = await usersRepo.save(
      usersRepo.create({
        username: `test_journal_poster_${Date.now()}`,
        passwordHash,
        fullName: 'Test Journal Poster',
        role: Role.MASTER,
        isActive: true,
      }),
    );
    userId = user.id;

    const accountsRepo = dataSource.getRepository(ChartOfAccount);
    const persediaan = await accountsRepo.findOneOrFail({
      where: { code: '1101' },
    });
    const pendapatan = await accountsRepo.findOneOrFail({
      where: { code: '4101' },
    });
    persediaanAccountId = persediaan.id;
    pendapatanAccountId = pendapatan.id;

    const inactive = await accountsRepo.save(
      accountsRepo.create({
        // chart_of_accounts.code adalah VARCHAR(20) — harus tetap pendek.
        code: `T-INA-${Date.now().toString().slice(-8)}`,
        name: 'Akun Nonaktif Uji (JournalPosterService spec)',
        accountType: AccountType.EXPENSE,
        isActive: false,
      }),
    );
    inactiveAccountId = inactive.id;
  });

  afterAll(async () => {
    if (createdEntryIds.length > 0) {
      // ON DELETE CASCADE di journal_entry_lines.journal_entry_id ikut
      // menghapus baris-barisnya.
      await dataSource.query('DELETE FROM journal_entries WHERE id = ANY($1)', [
        createdEntryIds,
      ]);
    }
    await dataSource.query('DELETE FROM chart_of_accounts WHERE id = $1', [
      inactiveAccountId,
    ]);
    await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    await dataSource.destroy();
  });

  function balancedDto(
    overrides: Partial<PostJournalDto> = {},
  ): PostJournalDto {
    return {
      entryDate: new Date(),
      description: 'Uji JournalPosterService',
      sourceType: 'MANUAL',
      sourceId: null,
      createdBy: userId,
      lines: [
        { accountId: persediaanAccountId, debit: 100_000, credit: 0 },
        { accountId: pendapatanAccountId, debit: 0, credit: 100_000 },
      ],
      ...overrides,
    };
  }

  it('post 1 baris -> error "minimal 2 baris"', async () => {
    const dto = balancedDto({
      lines: [{ accountId: persediaanAccountId, debit: 100_000, credit: 0 }],
    });

    await expect(
      dataSource.transaction((manager) => service.post(dto, manager)),
    ).rejects.toThrow(/minimal.*2 baris/i);
  });

  it('baris dengan debit dan credit sama-sama > 0 -> error', async () => {
    const dto = balancedDto({
      lines: [
        { accountId: persediaanAccountId, debit: 50_000, credit: 50_000 },
        { accountId: pendapatanAccountId, debit: 0, credit: 100_000 },
      ],
    });

    await expect(
      dataSource.transaction((manager) => service.post(dto, manager)),
    ).rejects.toThrow(/tepat salah satu/i);
  });

  it('baris dengan debit=0 dan credit=0 ditolak CHECK constraint di level DB', async () => {
    const parentRows: { id: string }[] = await dataSource.query(
      `INSERT INTO journal_entries (entry_number, entry_date, source_type, created_by)
       VALUES ($1, CURRENT_DATE, 'MANUAL', $2) RETURNING id`,
      [`JE/TEST/${Date.now()}`, userId],
    );
    const parentEntryId = parentRows[0].id;
    createdEntryIds.push(parentEntryId);

    await expect(
      dataSource.query(
        `INSERT INTO journal_entry_lines
           (journal_entry_id, account_id, debit_amount, credit_amount, line_order)
         VALUES ($1, $2, 0, 0, 1)`,
        [parentEntryId, persediaanAccountId],
      ),
    ).rejects.toThrow();
  });

  it('total tidak balance selisih 0.01 -> error dan document_counters TIDAK naik (rollback penuh)', async () => {
    const period = formatPeriodForToday();
    const before: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'JOURNAL_ENTRY' AND period = $1`,
      [period],
    );

    console.log('document_counters SEBELUM percobaan gagal:', before);

    const dto = balancedDto({
      lines: [
        { accountId: persediaanAccountId, debit: 100_000, credit: 0 },
        { accountId: pendapatanAccountId, debit: 0, credit: 99_999.99 },
      ],
    });

    await expect(
      dataSource.transaction((manager) => service.post(dto, manager)),
    ).rejects.toThrow(/tidak balance/i);

    const after: { last_number: number }[] = await dataSource.query(
      `SELECT last_number FROM document_counters WHERE doc_type = 'JOURNAL_ENTRY' AND period = $1`,
      [period],
    );

    console.log('document_counters SESUDAH percobaan gagal:', after);

    expect(after).toEqual(before);
  });

  it('akun non-aktif -> error', async () => {
    const dto = balancedDto({
      lines: [
        { accountId: persediaanAccountId, debit: 100_000, credit: 0 },
        { accountId: inactiveAccountId, debit: 0, credit: 100_000 },
      ],
    });

    await expect(
      dataSource.transaction((manager) => service.post(dto, manager)),
    ).rejects.toThrow(/tidak aktif/i);
  });

  it('entryDate 3 hari lalu (backdate_max_days=2) -> error', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    const dto = balancedDto({ entryDate: threeDaysAgo });

    await expect(
      dataSource.transaction((manager) => service.post(dto, manager)),
    ).rejects.toThrow(/maksimal mundur/i);
  });

  it('posting valid -> entry_number berformat JE/RM01-YYMMXXXX', async () => {
    const dto = balancedDto();

    const result = await dataSource.transaction((manager) =>
      service.post(dto, manager),
    );
    createdEntryIds.push(result.id);

    expect(result.entryNumber).toMatch(/^JE\/RM01-\d{8}$/);
    expect(result.lines).toHaveLength(2);
    expect(Number(result.lines[0].debitAmount)).toBe(100_000);
    expect(Number(result.lines[1].creditAmount)).toBe(100_000);
  });
});

function formatPeriodForToday(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}
