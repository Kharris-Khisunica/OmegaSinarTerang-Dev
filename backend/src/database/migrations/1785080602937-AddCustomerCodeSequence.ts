import { MigrationInterface, QueryRunner } from 'typeorm';

// Hotfix: kode customer sekarang bisa dibangkitkan backend (pola sama dengan
// brand/unit/salesman, lihat generateSequenceCode() + AddCodeSequencesToBrandsUnitsSalesmen).
export class AddCustomerCodeSequence1785080602937 implements MigrationInterface {
  name = 'AddCustomerCodeSequence1785080602937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE customer_code_seq;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS customer_code_seq;`);
  }
}
