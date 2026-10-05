import {
  bucketIndexFor,
  bucketLabels,
  daysBetween,
  toIsoDate,
} from './aging-bucket.util';

describe('aging-bucket.util', () => {
  describe('toIsoDate', () => {
    it('membaca objek Date lewat getter LOKAL, bukan UTC -- simetris dengan cara pg-types membentuknya', () => {
      // new Date(y, m-1, d) TANPA argumen zona waktu = tengah malam LOKAL,
      // persis cara pg-types mem-parse kolom `date` Postgres. Kalau
      // toIsoDate() salah pakai getter UTC, hasilnya akan mundur satu hari
      // untuk server yang zona waktunya di depan UTC (mis. WIB, UTC+7).
      const localMidnight = new Date(2026, 7, 6); // 6 Agustus 2026, lokal
      expect(toIsoDate(localMidnight)).toBe('2026-08-06');
    });

    it('string "YYYY-MM-DD" diteruskan apa adanya (dipotong ke 10 karakter)', () => {
      expect(toIsoDate('2026-08-06')).toBe('2026-08-06');
      expect(toIsoDate('2026-08-06T00:00:00.000Z')).toBe('2026-08-06');
    });
  });

  describe('daysBetween', () => {
    it('menghitung selisih hari kalender murni (UTC), bukan 24 jam presisi', () => {
      expect(daysBetween('2026-08-01', '2026-08-31')).toBe(30);
      expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
      expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0);
    });
  });

  describe('bucketIndexFor', () => {
    const N = 30;

    it('hari 1..N (batas bawah & atas) masuk bucket 0 ("1-N")', () => {
      expect(bucketIndexFor(1, N)).toBe(0);
      expect(bucketIndexFor(N, N)).toBe(0);
    });

    it('umur 0 (faktur hari ini) dan negatif (belum jatuh tempo) juga bucket 0', () => {
      expect(bucketIndexFor(0, N)).toBe(0);
      expect(bucketIndexFor(-5, N)).toBe(0);
    });

    it('hari N+1..2N masuk bucket 1 ("N+1-2N")', () => {
      expect(bucketIndexFor(N + 1, N)).toBe(1);
      expect(bucketIndexFor(2 * N, N)).toBe(1);
    });

    it('hari 2N+1..3N masuk bucket 2 ("2N+1-3N")', () => {
      expect(bucketIndexFor(2 * N + 1, N)).toBe(2);
      expect(bucketIndexFor(3 * N, N)).toBe(2);
    });

    it('lebih dari 3N masuk bucket 3 (">3N"), tidak pernah melebihi index 3', () => {
      expect(bucketIndexFor(3 * N + 1, N)).toBe(3);
      expect(bucketIndexFor(10_000, N)).toBe(3);
    });

    it('bekerja untuk lebar bucket non-default (bukan hardcode 30)', () => {
      expect(bucketIndexFor(15, 15)).toBe(0);
      expect(bucketIndexFor(16, 15)).toBe(1);
      expect(bucketIndexFor(46, 15)).toBe(3);
    });
  });

  describe('bucketLabels', () => {
    it('label dibentuk dari N, bukan teks "30 hari" tertulis manual', () => {
      expect(bucketLabels(30)).toEqual(['1-30', '31-60', '61-90', '>90']);
      expect(bucketLabels(15)).toEqual(['1-15', '16-30', '31-45', '>45']);
    });
  });
});
