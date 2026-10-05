import { ActionType } from './action-type.enum';
import { matchesApprovedPayload } from './payload-matchers';

describe('matchesApprovedPayload', () => {
  it('CASH_OUTFLOW: payload identik (akun + nominal sama) -> cocok', () => {
    const approved = { accountId: 'acc-kas-besar', amount: 1_000_000 };
    const current = { accountId: 'acc-kas-besar', amount: 1_000_000 };

    expect(
      matchesApprovedPayload(ActionType.CASH_OUTFLOW, approved, current),
    ).toBe(true);
  });

  it('CASH_OUTFLOW: approval Rp 1.000.000 TIDAK cocok dipakai eksekusi Rp 100.000.000', () => {
    const approved = { accountId: 'acc-kas-besar', amount: 1_000_000 };
    const current = { accountId: 'acc-kas-besar', amount: 100_000_000 };

    expect(
      matchesApprovedPayload(ActionType.CASH_OUTFLOW, approved, current),
    ).toBe(false);
  });

  it('CASH_OUTFLOW: nominal sama tapi akun beda -> tidak cocok', () => {
    const approved = { accountId: 'acc-kas-besar', amount: 1_000_000 };
    const current = { accountId: 'acc-kas-kecil', amount: 1_000_000 };

    expect(
      matchesApprovedPayload(ActionType.CASH_OUTFLOW, approved, current),
    ).toBe(false);
  });

  it('CASH_OUTFLOW: field lain yang tidak relevan boleh berbeda', () => {
    const approved = {
      accountId: 'acc-kas-besar',
      amount: 1_000_000,
      note: 'A',
    };
    const current = {
      accountId: 'acc-kas-besar',
      amount: 1_000_000,
      note: 'B',
    };

    expect(
      matchesApprovedPayload(ActionType.CASH_OUTFLOW, approved, current),
    ).toBe(true);
  });

  it('TEST_STEP_UP_ACTION: selalu cocok (tidak ada isi sensitif)', () => {
    expect(
      matchesApprovedPayload('TEST_STEP_UP_ACTION', { a: 1 }, { a: 2 }),
    ).toBe(true);
  });

  it('actionType belum terdaftar -> throw (fail closed, bukan diam-diam meloloskan)', () => {
    // Bukan salah satu ActionType terdaftar — probe generik yang tidak
    // bergantung pada anggota enum mana pun tetap belum punya matcher (Hari
    // 22 mendaftarkan VOID_DOCUMENT, jangan pakai itu sebagai contoh lagi).
    expect(() => matchesApprovedPayload('UNKNOWN_ACTION_TYPE', {}, {})).toThrow(
      /Belum ada aturan pencocokan payload/,
    );
  });

  it('VOID_DOCUMENT: sourceType+sourceId identik -> cocok', () => {
    const approved = { sourceType: 'SALES_INVOICE', sourceId: 'inv-1' };
    const current = { sourceType: 'SALES_INVOICE', sourceId: 'inv-1' };

    expect(
      matchesApprovedPayload(ActionType.VOID_DOCUMENT, approved, current),
    ).toBe(true);
  });

  it('VOID_DOCUMENT: token faktur A tidak cocok dipakai untuk faktur B', () => {
    const approved = { sourceType: 'SALES_INVOICE', sourceId: 'inv-1' };
    const current = { sourceType: 'SALES_INVOICE', sourceId: 'inv-2' };

    expect(
      matchesApprovedPayload(ActionType.VOID_DOCUMENT, approved, current),
    ).toBe(false);
  });
});
