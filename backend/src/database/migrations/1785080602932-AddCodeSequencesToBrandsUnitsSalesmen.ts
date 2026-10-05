import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCodeSequencesToBrandsUnitsSalesmen1785080602932 implements MigrationInterface {
  name = 'AddCodeSequencesToBrandsUnitsSalesmen1785080602932';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE brand_code_seq;`);
    await queryRunner.query(`CREATE SEQUENCE unit_code_seq;`);
    await queryRunner.query(`CREATE SEQUENCE salesman_code_seq;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS salesman_code_seq;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS unit_code_seq;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS brand_code_seq;`);
  }
}
