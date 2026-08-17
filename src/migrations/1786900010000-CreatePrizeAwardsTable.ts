import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePrizeAwardsTable1786900010000 implements MigrationInterface {
  name = 'CreatePrizeAwardsTable1786900010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prize_awards_period_enum') THEN
          CREATE TYPE "prize_awards_period_enum" AS ENUM ('weekly', 'monthly');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prize_awards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "period" "prize_awards_period_enum" NOT NULL,
        "periodKey" VARCHAR(10) NOT NULL,
        "userId" UUID NOT NULL,
        "rank" INT NOT NULL,
        "amount" BIGINT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_prize_awards_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // One row per winner per period; the (period, periodKey, rank) triple is what guarantees
    // a given week/month can't be paid out twice with duplicate ranks.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_prize_awards_period_key_rank" ON "prize_awards" ("period", "periodKey", "rank");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_prize_awards_period_key" ON "prize_awards" ("period", "periodKey");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "prize_awards";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "prize_awards_period_enum";`);
  }
}
