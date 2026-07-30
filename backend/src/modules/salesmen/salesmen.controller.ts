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
import { CreateSalesmanDto } from './dto/create-salesman.dto';
import { SalesmanQueryDto } from './dto/salesman-query.dto';
import { UpdateSalesmanDto } from './dto/update-salesman.dto';
import { SalesmenService } from './salesmen.service';

@Controller('salesmen')
export class SalesmenController {
  constructor(private readonly salesmenService: SalesmenService) {}

  @Get()
  findAll(@Query() query: SalesmanQueryDto) {
    return this.salesmenService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesmenService.findOne(id);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('CREATE', 'salesmen')
  @Post()
  create(@Body() dto: CreateSalesmanDto) {
    return this.salesmenService.create(dto);
  }

  @Roles(Role.MASTER, Role.OPERATOR)
  @Audit('UPDATE', 'salesmen')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesmanDto) {
    return this.salesmenService.update(id, dto);
  }
}
