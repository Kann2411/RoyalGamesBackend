import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastBingoPrizeAmountToBingoRooms1786900019000 implements MigrationInterface {
  name = 'AddLastBingoPrizeAmountToBingoRooms1786900019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_rooms" ADD COLUMN IF NOT EXISTS "lastBingoPrizeAmount" BIGINT NOT NULL DEFAULT 0;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_rooms" DROP COLUMN IF EXISTS "lastBingoPrizeAmount";`);
  }
}
