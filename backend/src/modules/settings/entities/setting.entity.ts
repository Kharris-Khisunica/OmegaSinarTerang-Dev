import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SettingValueType = 'BOOLEAN' | 'NUMBER' | 'STRING';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @Column({ name: 'value_type', type: 'varchar' })
  valueType: SettingValueType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
