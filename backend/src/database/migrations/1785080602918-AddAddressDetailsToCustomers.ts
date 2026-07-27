import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressDetailsToCustomers1785080602918 implements MigrationInterface {
  name = 'AddAddressDetailsToCustomers1785080602918';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      ADD COLUMN district VARCHAR(120),
      ADD COLUMN city VARCHAR(120),
      ADD COLUMN province VARCHAR(120);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customers
      DROP COLUMN district,
      DROP COLUMN city,
      DROP COLUMN province;
    `);
  }
}
