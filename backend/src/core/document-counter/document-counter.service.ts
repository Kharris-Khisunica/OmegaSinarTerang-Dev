import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export type DocumentType =
  | 'SALES_INVOICE'
  | 'SALES_ORDER'
  | 'PURCHASE_INVOICE'
  | 'DELIVERY_ORDER'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'PAYMENT'
  | 'JOURNAL_ENTRY';

const DOCUMENT_PREFIXES: Record<DocumentType, string> = {
  SALES_INVOICE: 'INV',
  SALES_ORDER: 'SO',
  PURCHASE_INVOICE: 'PI',
  DELIVERY_ORDER: 'SJ',
  SALES_RETURN: 'RJ',
  PURCHASE_RETURN: 'RB',
  PAYMENT: 'PAY',
  JOURNAL_ENTRY: 'JE',
};

@Injectable()
export class DocumentCounterService {
  async getNextNumber(
    docType: DocumentType,
    date: Date,
    manager: EntityManager,
  ): Promise<string> {
    const period = formatPeriod(date);

    // ON CONFLICT DO NOTHING dulu supaya baris period baru sudah pasti ada
    // sebelum di-lock — SELECT ... FOR UPDATE terhadap baris yang belum ada
    // tidak mengunci apa pun, yang membuat dua transaction pertama di period
    // baru sama-sama INSERT dan bentrok unique constraint.
    await manager.query(
      `INSERT INTO document_counters (doc_type, period, last_number)
       VALUES ($1, $2, 0)
       ON CONFLICT (doc_type, period) DO NOTHING`,
      [docType, period],
    );

    const rows: { last_number: number }[] = await manager.query(
      `SELECT last_number FROM document_counters
       WHERE doc_type = $1 AND period = $2
       FOR UPDATE`,
      [docType, period],
    );

    const nextNumber = Number(rows[0].last_number) + 1;

    await manager.query(
      `UPDATE document_counters SET last_number = $1
       WHERE doc_type = $2 AND period = $3`,
      [nextNumber, docType, period],
    );

    const prefix = DOCUMENT_PREFIXES[docType];
    return `${prefix}/${period}/${String(nextNumber).padStart(4, '0')}`;
  }
}

function formatPeriod(date: Date): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}
