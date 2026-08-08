import { MigrationInterface, QueryRunner } from 'typeorm';

export class BingoRealtimeAndEconomy1786400000000 implements MigrationInterface {
  name = 'BingoRealtimeAndEconomy1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS / DO block guards: this deploy's *previous* attempt may have already fallen
    // back to synchronize() (see AddGoogleIdToUsers1783467622917's fix) and applied some of these
    // columns already - this migration must be safe to (re)run regardless of that.
    await queryRunner.query(`ALTER TABLE "bingo_players" ADD COLUMN IF NOT EXISTS "userId" UUID;`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_bingo_players_user'
        ) THEN
          ALTER TABLE "bingo_players" ADD CONSTRAINT "FK_bingo_players_user"
            FOREIGN KEY ("userId") REFERENCES "users"(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "bingo_super_bingo_pools" ADD COLUMN IF NOT EXISTS "thresholdBall" INT NOT NULL DEFAULT 50;`);
    await queryRunner.query(`ALTER TABLE "bingo_super_bingo_pools" ADD COLUMN IF NOT EXISTS "resetBaseAmount" BIGINT NOT NULL DEFAULT 0;`);

    await queryRunner.query(`ALTER TABLE "bingo_winners" ADD COLUMN IF NOT EXISTS "roundNumber" INT;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_winners" DROP COLUMN IF EXISTS "roundNumber";`);
    await queryRunner.query(`ALTER TABLE "bingo_super_bingo_pools" DROP COLUMN IF EXISTS "resetBaseAmount";`);
    await queryRunner.query(`ALTER TABLE "bingo_super_bingo_pools" DROP COLUMN IF EXISTS "thresholdBall";`);
    await queryRunner.query(`ALTER TABLE "bingo_players" DROP CONSTRAINT IF EXISTS "FK_bingo_players_user";`);
    await queryRunner.query(`ALTER TABLE "bingo_players" DROP COLUMN IF EXISTS "userId";`);
  }
}
