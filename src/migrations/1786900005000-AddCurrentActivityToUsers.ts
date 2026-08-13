import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentActivityToUsers1786900005000 implements MigrationInterface {
  name = 'AddCurrentActivityToUsers1786900005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currentActivity" VARCHAR(120) NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "currentActivity";`);
  }
}
