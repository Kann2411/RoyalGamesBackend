import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatAnnouncedAtToWinners1786900000000 implements MigrationInterface {
  name = 'AddChatAnnouncedAtToWinners1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_winners" ADD COLUMN IF NOT EXISTS "chatAnnouncedAt" TIMESTAMP;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_winners" DROP COLUMN IF EXISTS "chatAnnouncedAt";`);
  }
}
