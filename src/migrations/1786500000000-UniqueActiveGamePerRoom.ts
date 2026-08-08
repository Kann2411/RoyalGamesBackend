import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueActiveGamePerRoom1786500000000 implements MigrationInterface {
  name = 'UniqueActiveGamePerRoom1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A room can only ever have ONE game that isn't finished/cancelled at a time. Without this,
    // a client entering a room (via REST, creating its first game) and the background engine
    // (which also creates a game the moment it notices the room has a live connection but no
    // game yet) can race and each independently decide "none exists yet, create one" - producing
    // two separate WAITING games for the same room. The client buys cards into one; the engine
    // (which always looks up the most-recently-created game) ends up watching the other, which
    // never receives a purchase, so its countdown reaches zero and the game just never starts.
    // Clean up any duplicates that already exist: keep, per room, whichever active game has the
    // most cards attached (i.e. the one a player actually bought into), not just the newest one -
    // an empty "phantom" game created later by the race must not win over one with real purchases.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT g.id,
               ROW_NUMBER() OVER (
                 PARTITION BY g."roomId"
                 ORDER BY (SELECT COUNT(*) FROM "bingo_cards" c WHERE c."gameId" = g.id) DESC, g."createdAt" DESC
               ) AS rn
        FROM "bingo_games" g
        WHERE g.state IN ('waiting', 'running')
      )
      DELETE FROM "bingo_games" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_games_active_room"
      ON "bingo_games" ("roomId")
      WHERE state IN ('waiting', 'running');
    `);

    // Same race, same fix, for the superbingo pool: getOrCreateSuperbingoForRoom is also a
    // check-then-create with no lock, called from many places (every snapshot build, every game
    // creation, every engine tick) - a room should only ever have exactly one pool.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY "roomId" ORDER BY "updatedAt" DESC) AS rn
        FROM "bingo_super_bingo_pools"
        WHERE "roomId" IS NOT NULL
      )
      DELETE FROM "bingo_super_bingo_pools" WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_super_bingo_pools_room"
      ON "bingo_super_bingo_pools" ("roomId")
      WHERE "roomId" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bingo_super_bingo_pools_room";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bingo_games_active_room";`);
  }
}
