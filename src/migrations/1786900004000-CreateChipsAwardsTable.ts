import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChipsAwardsTable1786900004000 implements MigrationInterface {
  name = 'CreateChipsAwardsTable1786900004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chips_awards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "amount" BIGINT NOT NULL,
        "source" VARCHAR(20) NOT NULL DEFAULT 'game',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_chips_awards_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chips_awards_user_source" ON "chips_awards" ("userId", "source");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chips_awards";`);
  }
}
