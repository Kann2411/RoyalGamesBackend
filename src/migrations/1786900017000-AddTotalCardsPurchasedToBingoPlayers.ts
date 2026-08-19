import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTotalCardsPurchasedToBingoPlayers1786900017000 implements MigrationInterface {
  name = 'AddTotalCardsPurchasedToBingoPlayers1786900017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_players" ADD COLUMN IF NOT EXISTS "totalCardsPurchased" BIGINT NOT NULL DEFAULT 0;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_players" DROP COLUMN IF EXISTS "totalCardsPurchased";`);
  }
}
