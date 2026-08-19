import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBingoNumberGuesses1786900018000 implements MigrationInterface {
  name = 'CreateBingoNumberGuesses1786900018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bingo_number_guesses" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "gameId" UUID NOT NULL,
        "playerId" UUID NOT NULL,
        "guessedNumber" INTEGER NOT NULL,
        "ipAddress" VARCHAR(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_bingo_number_guesses_game" FOREIGN KEY ("gameId") REFERENCES "bingo_games"(id) ON DELETE CASCADE,
        CONSTRAINT "FK_bingo_number_guesses_player" FOREIGN KEY ("playerId") REFERENCES "bingo_players"(id) ON DELETE CASCADE
      );
    `);

    // One guess per player per round.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_number_guesses_game_player"
      ON "bingo_number_guesses" ("gameId", "playerId");
    `);

    // One guess per IP address per round - the "no te hagas varias cuentas" guard. Partial (only
    // when ipAddress is known) so a connection that somehow carried no IP never blocks another.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_number_guesses_game_ip"
      ON "bingo_number_guesses" ("gameId", "ipAddress")
      WHERE "ipAddress" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bingo_number_guesses";`);
  }
}
