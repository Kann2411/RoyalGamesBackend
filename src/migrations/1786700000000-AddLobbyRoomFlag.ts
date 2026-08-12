import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLobbyRoomFlag1786700000000 implements MigrationInterface {
  name = 'AddLobbyRoomFlag1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The actual Lobby room row itself is created by BingoService.ensureLobbyRoom() at boot
    // (same pattern as ensureDefaultRooms() for the real bingo rooms) - this migration only adds
    // the column that marks it.
    await queryRunner.query(`ALTER TABLE "bingo_rooms" ADD COLUMN IF NOT EXISTS "isLobby" BOOLEAN NOT NULL DEFAULT false;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bingo_rooms" DROP COLUMN IF EXISTS "isLobby";`);
  }
}
