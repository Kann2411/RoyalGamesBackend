import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowConcurrentWaitingAndRunningGame1786900016000 implements MigrationInterface {
  name = 'AllowConcurrentWaitingAndRunningGame1786900016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // UQ_bingo_games_active_room (unique on roomId alone, for state IN waiting/running) used to
    // mean "at most one non-finished game per room, period" - that's what stopped the room from
    // having a RUNNING game AND a WAITING "next round" game open for purchases at the same time.
    // Replacing it with a per-state version: still at most one WAITING and at most one RUNNING per
    // room (the exact race this was built to prevent - see UniqueActiveGamePerRoom - is still
    // covered), but now one of each can coexist.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bingo_games_active_room";`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_bingo_games_active_room_state"
      ON "bingo_games" ("roomId", "state")
      WHERE state IN ('waiting', 'running');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_bingo_games_active_room_state";`);

    // Collapse back down to at most one active game per room before restoring the stricter index,
    // same cleanup UniqueActiveGamePerRoom did originally - keep whichever has the most cards.
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
  }
}
