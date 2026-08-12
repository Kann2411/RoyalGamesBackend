import { MigrationInterface, QueryRunner } from 'typeorm';

export class BingoChatAndPlayerLevel1786600000000 implements MigrationInterface {
  name = 'BingoChatAndPlayerLevel1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'mod' to the users.role enum. This dynamically looks up the ACTUAL Postgres enum type
    // backing that column instead of assuming a name like "users_role_enum" - this schema has
    // drifted from its migration history before (see AddGoogleIdToUsers), so don't guess.
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_type text;
      BEGIN
        SELECT udt_name INTO enum_type
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role';

        IF enum_type IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = enum_type AND e.enumlabel = 'mod'
          ) THEN
            EXECUTE format('ALTER TYPE %I ADD VALUE ''mod''', enum_type);
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "bingo_players" ADD COLUMN IF NOT EXISTS "level" INT NOT NULL DEFAULT 1;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bingo_chat_messages" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roomId" UUID NOT NULL,
        "playerId" UUID,
        "displayName" VARCHAR(120) NOT NULL,
        "role" VARCHAR(20),
        "message" VARCHAR(1000) NOT NULL,
        "type" VARCHAR(20) NOT NULL DEFAULT 'chat',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_bingo_chat_messages_room" FOREIGN KEY ("roomId") REFERENCES "bingo_rooms"(id) ON DELETE CASCADE,
        CONSTRAINT "FK_bingo_chat_messages_player" FOREIGN KEY ("playerId") REFERENCES "bingo_players"(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_bingo_chat_messages_room_created"
      ON "bingo_chat_messages" ("roomId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "bingo_chat_messages";`);
    await queryRunner.query(`ALTER TABLE "bingo_players" DROP COLUMN IF EXISTS "level";`);
    // Postgres cannot drop a single enum value - leaving 'mod' in place on down is intentional.
  }
}
