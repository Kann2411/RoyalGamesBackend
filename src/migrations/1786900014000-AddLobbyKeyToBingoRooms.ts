import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLobbyKeyToBingoRooms1786900014000 implements MigrationInterface {
  name = 'AddLobbyKeyToBingoRooms1786900014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bingo_rooms" ADD COLUMN IF NOT EXISTS "lobbyKey" VARCHAR(40);
    `);

    // The single pre-existing isLobby room (the main-menu chat/presence panel) becomes the
    // 'bingo' key - keeps ensureLobbyRoom()/getLobbyRoom() with no arguments resolving to the
    // exact same row as before this migration, so nothing about Bingo's own lobby changes.
    await queryRunner.query(`
      UPDATE "bingo_rooms" SET "lobbyKey" = 'bingo' WHERE "isLobby" = true AND "lobbyKey" IS NULL;
    `);

    // Lets other isLobby=true pseudo-rooms exist (ej. a separate chat channel for another game)
    // without colliding on the same key.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_bingo_rooms_lobby_key"
        ON "bingo_rooms" ("lobbyKey") WHERE "isLobby" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bingo_rooms_lobby_key";`);
    await queryRunner.query(`ALTER TABLE "bingo_rooms" DROP COLUMN IF EXISTS "lobbyKey";`);
  }
}
