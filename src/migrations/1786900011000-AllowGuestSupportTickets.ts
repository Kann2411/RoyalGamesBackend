import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowGuestSupportTickets1786900011000 implements MigrationInterface {
  name = 'AllowGuestSupportTickets1786900011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets" ALTER COLUMN "userId" DROP NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "guestName" VARCHAR(100);
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "guestEmail" VARCHAR(150);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "guestEmail";`);
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "guestName";`);
    await queryRunner.query(`ALTER TABLE "support_tickets" ALTER COLUMN "userId" SET NOT NULL;`);
  }
}
