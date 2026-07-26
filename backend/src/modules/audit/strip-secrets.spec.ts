import { stripSecrets } from './strip-secrets';

describe('stripSecrets', () => {
  it('membuang field rahasia level atas (snake_case)', () => {
    const input = {
      username: 'master',
      password: 'rahasia123',
      password_hash: '$2b$10$abunchofstuff',
      token: 'abc.def.ghi',
      refresh_token: 'xyz.123',
    };

    const result = stripSecrets(input);

    expect(result).toEqual({ username: 'master' });
  });

  it('membuang field rahasia camelCase (mis. dari entity TypeORM)', () => {
    const input = {
      fullName: 'Master Admin',
      passwordHash: '$2b$10$abunchofstuff',
      refreshTokenHash: '$2b$10$anotherhash',
    };

    const result = stripSecrets(input);

    expect(result).toEqual({ fullName: 'Master Admin' });
  });

  it('membuang accessToken dari response body login', () => {
    const input = {
      accessToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
      refreshToken: 'eyJhbGciOiJIUzI1NiJ9.payload.sig2',
      user: { id: '1', username: 'operator' },
    };

    const result = stripSecrets(input);

    expect(result).toEqual({ user: { id: '1', username: 'operator' } });
  });

  it('membuang field rahasia di dalam objek nested', () => {
    const input = {
      before: { username: 'operator', password: 'rahasia' },
      after: { username: 'operator', isActive: false },
    };

    const result = stripSecrets(input);

    expect(result).toEqual({
      before: { username: 'operator' },
      after: { username: 'operator', isActive: false },
    });
  });

  it('membuang field rahasia di dalam array of object', () => {
    const input = [
      { username: 'a', token: 't1' },
      { username: 'b', token: 't2' },
    ];

    const result = stripSecrets(input);

    expect(result).toEqual([{ username: 'a' }, { username: 'b' }]);
  });

  it('tidak mengubah data yang tidak mengandung field rahasia', () => {
    const input = { username: 'master', role: 'MASTER' };

    expect(stripSecrets(input)).toEqual(input);
  });

  it('menangani null dan primitif tanpa error', () => {
    expect(stripSecrets(null)).toBeNull();
    expect(stripSecrets(undefined)).toBeUndefined();
    expect(stripSecrets('plain string')).toBe('plain string');
    expect(stripSecrets(42)).toBe(42);
  });

  it('hasil JSON.stringify tidak pernah mengandung string "password"', () => {
    const input = {
      username: 'master',
      password: 'rahasia123',
      password_hash: '$2b$10$abunchofstuff',
    };

    const result = stripSecrets(input);

    expect(JSON.stringify(result)).not.toContain('password');
  });
});
