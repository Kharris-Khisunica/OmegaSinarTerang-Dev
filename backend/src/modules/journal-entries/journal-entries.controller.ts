import { Controller, Get, Param, Query } from '@nestjs/common';
import { JournalEntryQueryDto } from './dto/journal-entry-query.dto';
import { JournalEntriesService } from './journal-entries.service';

// Read-only dengan sengaja: tidak ada POST/PATCH/DELETE di controller ini,
// dan tidak akan pernah ada (CLAUDE.md — jurnal tidak bisa diubah/dihapus).
// Posting jurnal HANYA lewat JournalPosterService.post() dipanggil dari
// modul transaksi lain (Manual Journal Hari 9, Purchase/Sales Invoice
// Hari 11+, dst.), bukan lewat endpoint publik di sini.
//
// RBAC: tidak ada @Roles() di sini dengan sengaja — dibuka untuk SEMUA role
// login (MASTER/SUPERVISOR/OPERATOR), sesuai instruksi tugas FE Hari 6
// ("Jurnal boleh dilihat semua role"). Berbeda dari GET /chart-of-accounts
// yang tetap Operator 403 (CLAUDE.md §5 eksplisit). Keputusan ini
// menggantikan asumsi awal (MASTER+SUPERVISOR saja) yang ditulis saat
// endpoint ini dibuat — cek ulang bareng permission matrix lengkap saat
// audit RBAC Hari 32.
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
