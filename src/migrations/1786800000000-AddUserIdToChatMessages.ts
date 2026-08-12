import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToChatMessages1786800000000 implements MigrationInterface {
  name = 'AddUserIdToChatMessages1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_chat_messages" ADD COLUMN IF NOT EXISTS "userId" UUID;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_chat_messages" DROP COLUMN IF EXISTS "userId";`);
  }
}
