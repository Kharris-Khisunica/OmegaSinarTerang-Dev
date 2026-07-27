import { IsDefined } from 'class-validator';

export class UpdateSettingDto {
  @IsDefined()
  value: string | number | boolean;
}
