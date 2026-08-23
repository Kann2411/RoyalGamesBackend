import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBingoAutoBuySubscriptions1786900020000 implements MigrationInterface {
  name = 'CreateBingoAutoBuySubscriptions1786900020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bingo_auto_buy_subscriptions" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "playerId" UUID NOT NULL,
        "roomId" UUID NOT NULL,
        "cardsPerGame" INTEGER NOT NULL,
        "remainingGames" INTEGER NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_bingo_auto_buy_subscriptions_player" FOREIGN KEY ("playerId") REFERENCES "bingo_players"(id) ON DELETE CASCADE,
        CONSTRAINT "FK_bingo_auto_buy_subscriptions_room" FOREIGN KEY ("roomId") REFERENCES "bingo_rooms"(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bingo_auto_buy_subscriptions_room_active"
      ON "bingo_auto_buy_subscriptions" ("roomId", "active");
    `);

    // One ACTIVE subscription per player per room - setting a new one updates the existing row in
    // place (see BingoService.setAutoBuy) instead of stacking duplicates.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_auto_buy_subscriptions_player_room_active"
      ON "bingo_auto_buy_subscriptions" ("playerId", "roomId")
      WHERE "active" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bingo_auto_buy_subscriptions";`);
  }
}
