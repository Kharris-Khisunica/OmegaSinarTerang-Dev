import { Supplier } from './entities/supplier.entity';

/** "PT ABC Jaya" -> "PT A***" (kata pertama utuh, kata kedua disingkat). */
export function maskName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '***';
  }
  if (words.length === 1) {
    return words[0].length > 1 ? `${words[0][0]}***` : '***';
  }
  const [first, second] = words;
  return `${first} ${second[0]}***`;
}

/** "081234567789" -> "0812****789" (4 karakter depan, 3 belakang, tengah di-mask). */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 7) {
    return '*'.repeat(trimmed.length);
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
}

/** Alamat: hanya kata pertama yang tampil, sisanya di-mask. */
export function maskAddress(address: string): string {
  return maskName(address);
}

export interface MaskableSupplier {
  displayCode: string;
  name: string;
  contactPhone: string | null;
  contactAddress: string | null;
}

export function maskSupplier<T extends MaskableSupplier>(supplier: T): T {
  return {
    ...supplier,
    name: maskName(supplier.name),
    contactPhone: supplier.contactPhone
      ? maskPhone(supplier.contactPhone)
      : supplier.contactPhone,
    contactAddress: supplier.contactAddress
      ? maskAddress(supplier.contactAddress)
      : supplier.contactAddress,
  };
}

export function isSupplierShaped(value: unknown): value is Supplier {
  return (
    !!value &&
    typeof value === 'object' &&
    'displayCode' in value &&
    'name' in value
  );
}
