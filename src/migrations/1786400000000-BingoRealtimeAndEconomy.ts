import { MigrationInterface, QueryRunner } from 'typeorm';

export class BingoRealtimeAndEconomy1786400000000 implements MigrationInterface {
  name = 'BingoRealtimeAndEconomy1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bingo_players" ADD COLUMN "userId" UUID;
      ALTER TABLE "bingo_players" ADD CONSTRAINT "FK_bingo_players_user"
        FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "bingo_super_bingo_pools" ADD COLUMN "thresholdBall" INT NOT NULL DEFAULT 50;
      ALTER TABLE "bingo_super_bingo_pools" ADD COLUMN "resetBaseAmount" BIGINT NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "bingo_winners" ADD COLUMN "roundNumber" INT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_winners" DROP COLUMN "roundNumber";`);
    await queryRunner.query(`
      ALTER TABLE "bingo_super_bingo_pools" DROP COLUMN "resetBaseAmount";
      ALTER TABLE "bingo_super_bingo_pools" DROP COLUMN "thresholdBall";
    `);
    await queryRunner.query(`
      ALTER TABLE "bingo_players" DROP CONSTRAINT "FK_bingo_players_user";
      ALTER TABLE "bingo_players" DROP COLUMN "userId";
    `);
  }
}
