import { BadRequestException } from '@nestjs/common';
import { UnitConversionDto } from '../dto/unit-conversion.dto';

/**
 * `unitConversions` berisi satuan DI ATAS base_unit saja (base_unit sendiri
 * qty implisit = 1, tidak dikirim ulang di array). level wajib berurutan
 * mulai 1 tanpa lompat/duplikat, dan unit_name tidak boleh sama dengan
 * base_unit maupun duplikat sesama konversi.
 */
export function validateUnitConversions(
  baseUnit: string,
  conversions: UnitConversionDto[] | undefined,
): void {
  if (!conversions || conversions.length === 0) {
    return;
  }

  const normalizedBaseUnit = baseUnit.trim().toLowerCase();
  const seenUnitNames = new Set<string>();

  for (const conversion of conversions) {
    const normalizedUnitName = conversion.unitName.trim().toLowerCase();

    if (normalizedUnitName === normalizedBaseUnit) {
      throw new BadRequestException(
        `Satuan konversi "${conversion.unitName}" tidak boleh sama dengan base unit.`,
      );
    }

    if (seenUnitNames.has(normalizedUnitName)) {
      throw new BadRequestException(
        `Satuan konversi "${conversion.unitName}" duplikat.`,
      );
    }
    seenUnitNames.add(normalizedUnitName);
  }

  const sortedLevels = conversions.map((c) => c.level).sort((a, b) => a - b);
  const expectedLevels = sortedLevels.map((_, index) => index + 1);
  const isSequential = sortedLevels.every(
    (level, index) => level === expectedLevels[index],
  );

  if (!isSequential) {
    throw new BadRequestException(
      'Level konversi satuan harus berurutan mulai dari 1 tanpa lompat atau duplikat.',
    );
  }
}
