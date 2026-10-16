import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { SubmitOpeningBalanceDto } from './dto/submit-opening-balance.dto';
import { OpeningBalanceImportService } from './opening-balance-import.service';
import { OpeningBalanceService } from './opening-balance.service';

interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}

// MASTER only (CLAUDE.md §5 Permission Matrix, baris "Saldo Awal, Settings").
@Controller('opening-balance')
@Roles(Role.MASTER)
export class OpeningBalanceController {
  constructor(
    private readonly openingBalanceService: OpeningBalanceService,
    private readonly openingBalanceImportService: OpeningBalanceImportService,
  ) {}

  @Audit('POST_OPENING_BALANCE', 'opening_balance')
  @Post()
  submit(@Body() dto: SubmitOpeningBalanceDto, @Req() req: RequestWithUser) {
    return this.openingBalanceService.submit(dto, req.user.sub);
  }

  @Get('verify')
  verify() {
    return this.openingBalanceService.verify();
  }

  // need_fixing.md #21 — impor Excel. Template usulan developer; /import
  // HANYA mengurai jadi pratinjau (tidak memposting) — posting tetap lewat
  // POST / di atas, satu alur (CLAUDE.md §3 "Saldo Awal").
  @Get('template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="template-saldo-awal.xlsx"',
  )
  async template() {
    return new StreamableFile(
      await this.openingBalanceImportService.buildTemplate(),
    );
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  import(@UploadedFile() file: { buffer: Buffer; size: number }) {
    return this.openingBalanceImportService.parse(file);
  }
}
