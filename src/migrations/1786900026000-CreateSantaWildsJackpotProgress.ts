import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSantaWildsJackpotProgress1786900026000 implements MigrationInterface {
  name = 'CreateSantaWildsJackpotProgress1786900026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "santawilds_jackpot_progress" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "betAmount" BIGINT NOT NULL,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_santawilds_jackpot_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Un solo registro de progreso por jugador y por precio de apuesta - cambiar de apuesta y
    // volver retoma el mismo contador en vez de crear duplicados.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_santawilds_jackpot_progress_user_bet"
      ON "santawilds_jackpot_progress" ("userId", "betAmount");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "santawilds_jackpot_progress";`);
  }
}
