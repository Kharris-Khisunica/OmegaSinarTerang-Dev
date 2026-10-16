import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JournalEntryQueryDto } from './dto/journal-entry-query.dto';
import { JournalEntriesService } from './journal-entries.service';

// Read-only dengan sengaja: tidak ada POST/PATCH/DELETE di controller ini,
// dan tidak akan pernah ada (CLAUDE.md — jurnal tidak bisa diubah/dihapus).
// Posting jurnal HANYA lewat JournalPosterService.post() dipanggil dari
// modul transaksi lain (Manual Journal Hari 9, Purchase/Sales Invoice
// Hari 11+, dst.), bukan lewat endpoint publik di sini.
//
// RBAC: MASTER + SUPERVISOR saja — OPERATOR 403 (keputusan 6 Okt 2026,
// need_fixing.md #17; menggantikan "Jurnal boleh dilihat semua role" dari
// FE Hari 6). Sejalan dengan GET /chart-of-accounts yang juga Operator 403
// (CLAUDE.md §5): operator tidak butuh melihat akun/jurnal.
@Roles(Role.MASTER, Role.SUPERVISOR)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  findAll(@Query() query: JournalEntryQueryDto) {
    return this.journalEntriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.journalEntriesService.findOne(id);
  }
}
