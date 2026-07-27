import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting, SettingValueType } from './entities/setting.entity';

export interface TypedSetting {
  key: string;
  value: string | number | boolean;
  valueType: SettingValueType;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingsRepository: Repository<Setting>,
  ) {}

  async findAll(): Promise<TypedSetting[]> {
    const settings = await this.settingsRepository.find({
      order: { key: 'ASC' },
    });
    return settings.map((setting) => this.toTyped(setting));
  }

  async update(
    key: string,
    value: string | number | boolean,
  ): Promise<TypedSetting> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" tidak ditemukan.`);
    }

    setting.value = this.stringifyForType(setting.valueType, value, key);
    const saved = await this.settingsRepository.save(setting);
    return this.toTyped(saved);
  }

  private toTyped(setting: Setting): TypedSetting {
    return {
      key: setting.key,
      valueType: setting.valueType,
      value: this.parseValue(setting.valueType, setting.value),
    };
  }

  private parseValue(
    valueType: SettingValueType,
    raw: string,
  ): string | number | boolean {
    switch (valueType) {
      case 'BOOLEAN':
        return raw === 'true';
      case 'NUMBER':
        return Number(raw);
      case 'STRING':
      default:
        return raw;
    }
  }

  private stringifyForType(
    valueType: SettingValueType,
    value: string | number | boolean,
    key: string,
  ): string {
    switch (valueType) {
      case 'BOOLEAN':
        if (typeof value === 'boolean') {
          return String(value);
        }
        if (value === 'true' || value === 'false') {
          return value;
        }
        throw new BadRequestException(
          `Setting "${key}" bertipe BOOLEAN, kirim true/false.`,
        );
      case 'NUMBER': {
        const numeric = typeof value === 'number' ? value : Number(value);
        if (Number.isNaN(numeric)) {
          throw new BadRequestException(
            `Setting "${key}" bertipe NUMBER, kirim angka valid.`,
          );
        }
        return String(numeric);
      }
      case 'STRING':
      default:
        return String(value);
    }
  }
}
