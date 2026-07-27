import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
  resolveSortColumn,
  resolveSortDir,
} from '../../common/pagination';
import { JournalEntryQueryDto } from './dto/journal-entry-query.dto';
import { JournalEntry } from './entities/journal-entry.entity';

const SORTABLE_COLUMNS = ['entryNumber', 'entryDate', 'createdAt'] as const;

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectRepository(JournalEntry)
    private readonly journalEntriesRepository: Repository<JournalEntry>,
  ) {}

  // Sengaja TIDAK leftJoinAndSelect `lines` di list: menggabung relasi
  // one-to-many bareng skip/take bikin LIMIT/OFFSET Postgres jalan di level
  // baris hasil JOIN (bukan per entry), jadi paginasi bisa salah begitu ada
  // entry dengan >1 baris. Detail baris cukup di findOne (single entry, tanpa
  // paginasi, jadi aman).
  async findAll(
    query: JournalEntryQueryDto,
  ): Promise<PaginatedResult<JournalEntry>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = resolveSortColumn(
      query.sortBy,
      SORTABLE_COLUMNS,
      'entryDate',
    );
    const sortDir = resolveSortDir(query.sortDir);

    const qb = this.journalEntriesRepository.createQueryBuilder('entry');

    if (query.search) {
      qb.andWhere(
        '(entry.entryNumber ILIKE :search OR entry.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.dateFrom) {
      qb.andWhere('entry.entryDate >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere('entry.entryDate <= :dateTo', { dateTo: query.dateTo });
    }
    if (query.sourceType) {
      qb.andWhere('entry.sourceType = :sourceType', {
        sourceType: query.sourceType,
      });
    }
    if (query.sourceId) {
      qb.andWhere('entry.sourceId = :sourceId', { sourceId: query.sourceId });
    }
    if (query.accountId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM journal_entry_lines jel
                 WHERE jel.journal_entry_id = entry.id AND jel.account_id = :accountId)`,
        { accountId: query.accountId },
      );
    }

    qb.orderBy(`entry.${sortColumn}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string): Promise<JournalEntry> {
    const entry = await this.journalEntriesRepository.findOne({
      where: { id },
      relations: { lines: { account: true } },
      order: { lines: { lineOrder: 'ASC' } },
    });
    if (!entry) {
      throw new NotFoundException('Jurnal tidak ditemukan.');
    }
    return entry;
  }
}
