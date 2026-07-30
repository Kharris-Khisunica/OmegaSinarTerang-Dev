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
    expect(() =>
      matchesApprovedPayload(ActionType.VOID_DOCUMENT, {}, {}),
    ).toThrow(/Belum ada aturan pencocokan payload/);
  });
});
