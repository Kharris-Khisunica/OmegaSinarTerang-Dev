import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { Audit } from '../audit/decorators/audit.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { WorkerQueryDto } from './dto/worker-query.dto';
import { WorkersService } from './workers.service';

// Tanpa role restriction khusus (Hari 32A tugas 3) — dipakai baik OPERATOR
// maupun MASTER lewat baris Biaya Operasional (Gaji Tukang Angkut, Kasbon).
@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  findAll(@Query() query: WorkerQueryDto) {
    return this.workersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(id);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'workers')
  @Post()
  create(@Body() dto: CreateWorkerDto) {
    return this.workersService.create(dto);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('UPDATE', 'workers')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkerDto) {
    return this.workersService.update(id, dto);
  }
}
