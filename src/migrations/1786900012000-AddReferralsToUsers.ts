import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralsToUsers1786900012000 implements MigrationInterface {
  name = 'AddReferralsToUsers1786900012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" VARCHAR(12);
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredBy" UUID;
    `);

    // Backfill a code for every existing user so referrals work retroactively for old accounts.
    await queryRunner.query(`
      UPDATE "users" SET "referralCode" = upper(substr(md5(random()::text || id::text), 1, 8))
      WHERE "referralCode" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_referral_code" ON "users" ("referralCode");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_referred_by" ON "users" ("referredBy");
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_referred_by'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "FK_users_referred_by"
            FOREIGN KEY ("referredBy") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_referred_by";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_referred_by";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_referral_code";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referredBy";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referralCode";`);
  }
}
