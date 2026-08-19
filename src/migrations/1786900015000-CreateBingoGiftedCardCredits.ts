import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBingoGiftedCardCredits1786900015000 implements MigrationInterface {
  name = 'CreateBingoGiftedCardCredits1786900015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bingo_gifted_card_credits" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipientPlayerId" UUID NOT NULL,
        "betAmount" BIGINT NOT NULL,
        "giftedByPlayerId" UUID,
        "giftedByDisplayName" VARCHAR(120),
        "redeemedAt" TIMESTAMP,
        "redeemedGameId" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_bingo_gifted_card_credits_recipient" FOREIGN KEY ("recipientPlayerId") REFERENCES "bingo_players"(id) ON DELETE CASCADE,
        CONSTRAINT "FK_bingo_gifted_card_credits_gifted_by" FOREIGN KEY ("giftedByPlayerId") REFERENCES "bingo_players"(id) ON DELETE SET NULL,
        CONSTRAINT "FK_bingo_gifted_card_credits_redeemed_game" FOREIGN KEY ("redeemedGameId") REFERENCES "bingo_games"(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bingo_gifted_card_credits_recipient_tier_pending"
      ON "bingo_gifted_card_credits" ("recipientPlayerId", "betAmount", "redeemedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bingo_gifted_card_credits";`);
  }
}
