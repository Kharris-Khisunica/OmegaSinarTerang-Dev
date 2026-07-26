const SECRET_KEYS = [
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'refresh_token_hash',
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Menormalkan key camelCase ke snake_case supaya cocok dengan SECRET_KEYS.
export function stripSecrets<T>(data: T): T {
  if (Array.isArray(data)) {
    return (data as unknown[]).map((item: unknown) =>
      stripSecrets(item),
    ) as unknown as T;
  }

  if (!isPlainObject(data)) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (SECRET_KEYS.includes(normalizedKey)) {
      continue;
    }
    result[key] = stripSecrets(value);
  }
  return result as T;
}
