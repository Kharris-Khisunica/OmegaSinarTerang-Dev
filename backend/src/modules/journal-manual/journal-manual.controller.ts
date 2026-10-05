import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PostManualJournalDto } from './dto/post-manual-journal.dto';
import { JournalManualService } from './journal-manual.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// Prefix 'journal-entries' SAMA dengan JournalEntriesController (read-only),
// tapi controller class BERBEDA — Nest tidak konflik karena tidak ada
// tabrakan method+path (GET /, GET /:id di sana; POST /manual di sini).
// JournalEntriesController tetap dibiarkan read-only sesuai komentarnya.
@Controller('journal-entries')
@Roles(Role.MASTER)
export class JournalManualController {
  constructor(private readonly journalManualService: JournalManualService) {}

  @Audit('POST_MANUAL_JOURNAL', 'journal_entries')
  @Post('manual')
  postManual(@Body() dto: PostManualJournalDto, @Req() req: RequestWithUser) {
    return this.journalManualService.postManual(dto, req.user.sub);
  }
}
