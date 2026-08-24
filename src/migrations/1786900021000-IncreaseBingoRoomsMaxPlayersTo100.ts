import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseBingoRoomsMaxPlayersTo1001786900021000 implements MigrationInterface {
  name = 'IncreaseBingoRoomsMaxPlayersTo1001786900021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only the non-lobby rooms - the lobby pseudo-room already uses a much higher maxPlayers
    // (100000) since it's chat/presence-only, no game capacity concept applies to it.
    await queryRunner.query(`UPDATE "bingo_rooms" SET "maxPlayers" = 100 WHERE "isLobby" = false AND "maxPlayers" < 100;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "bingo_rooms" SET "maxPlayers" = 8 WHERE "isLobby" = false AND "maxPlayers" = 100;`);
  }
}
