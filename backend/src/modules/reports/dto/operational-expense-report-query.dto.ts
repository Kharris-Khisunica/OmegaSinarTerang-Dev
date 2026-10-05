import { Matches } from 'class-validator';

// GET /reports/operational-expenses?month=YYYY-MM (Hari 32A tugas 10).
export class OperationalExpenseReportQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month harus format YYYY-MM, contoh 2026-09.',
  })
  month: string;
}
