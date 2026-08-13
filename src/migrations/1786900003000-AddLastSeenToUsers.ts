import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastSeenToUsers1786900003000 implements MigrationInterface {
  name = 'AddLastSeenToUsers1786900003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastSeen";`);
  }
}
