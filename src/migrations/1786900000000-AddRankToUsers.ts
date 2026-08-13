import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankToUsers1786900000000 implements MigrationInterface {
  name = 'AddRankToUsers1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_rank_enum') THEN
          CREATE TYPE "users_rank_enum" AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rank" "users_rank_enum" NOT NULL DEFAULT 'bronze';
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalChipsDeposited" BIGINT NOT NULL DEFAULT 0;
    `);

    // Backfill: sum all approved deposits per user into the new denormalized counter.
    await queryRunner.query(`
      UPDATE "users" u
      SET "totalChipsDeposited" = COALESCE(sub.total, 0)
      FROM (
        SELECT "userId", SUM("chips") AS total
        FROM "pays"
        WHERE "status" = 'approved'
        GROUP BY "userId"
      ) sub
      WHERE u.id = sub."userId";
    `);

    // Backfill rank to match the recomputed totals, so existing depositors aren't stuck at Bronze.
    await queryRunner.query(`
      UPDATE "users"
      SET "rank" = CASE
        WHEN "totalChipsDeposited" >= 50000 THEN 'diamond'
        WHEN "totalChipsDeposited" >= 10000 THEN 'platinum'
        WHEN "totalChipsDeposited" >= 5000 THEN 'gold'
        WHEN "totalChipsDeposited" >= 1000 THEN 'silver'
        ELSE 'bronze'
      END::"users_rank_enum";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "totalChipsDeposited";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "rank";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_rank_enum";`);
  }
}
