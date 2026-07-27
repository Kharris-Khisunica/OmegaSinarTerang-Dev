import { Controller, Get } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChartOfAccountsService } from './chart-of-accounts.service';

// Read-only dengan sengaja: CRUD penuh (create/update akun, kas/bank custom
// Master) baru Hari 15. Endpoint ini dibuat lebih awal (Hari 6) karena FE
// COA (tree, view-only) dan GET /journal-entries butuh daftar akun nyata —
// lihat catatan "Dicatat, TIDAK dikerjakan" di PROGRESS.md §4 Hari 6.
// Dataset kecil (11 akun seed) → flat list saja, FE yang menyusun tree dari
// `parentId`, tidak perlu pagination di sini.
@Controller('chart-of-accounts')
@Roles(Role.MASTER, Role.SUPERVISOR)
export class ChartOfAccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
  ) {}

  @Get()
  findAll() {
    return this.chartOfAccountsService.findAll();
  }
}
