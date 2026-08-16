import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMinesRoundsTable1786900013000 implements MigrationInterface {
  name = 'CreateMinesRoundsTable1786900013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mines_rounds" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "betAmount" BIGINT NOT NULL,
        "minesCount" INT NOT NULL,
        "tileCount" INT NOT NULL DEFAULT 25,
        "minePositions" JSONB NOT NULL,
        "revealedTiles" JSONB NOT NULL DEFAULT '[]',
        "multiplierBp" INT NOT NULL,
        "incrementBp" INT NOT NULL,
        "accumulatedWinnings" BIGINT NOT NULL DEFAULT 0,
        "status" VARCHAR(20) NOT NULL DEFAULT 'active',
        "serverSeed" VARCHAR NOT NULL,
        "serverSeedHash" VARCHAR NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resolvedAt" TIMESTAMP,
        CONSTRAINT "FK_mines_rounds_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mines_rounds_user" ON "mines_rounds" ("userId");
    `);

    // Enforces "at most one active round per user" at the DB level, closing the race where two
    // concurrent `start` calls both pass the in-app pre-check before either commits.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mines_rounds_user_active"
        ON "mines_rounds" ("userId") WHERE "status" = 'active';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mines_rounds";`);
  }
}
