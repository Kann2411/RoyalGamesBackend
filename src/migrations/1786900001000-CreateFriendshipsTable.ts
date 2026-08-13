import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFriendshipsTable1786900001000 implements MigrationInterface {
  name = 'CreateFriendshipsTable1786900001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendships_status_enum') THEN
          CREATE TYPE "friendships_status_enum" AS ENUM ('pending', 'accepted', 'declined');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "friendships" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "requesterId" UUID NOT NULL,
        "addresseeId" UUID NOT NULL,
        "status" "friendships_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "respondedAt" TIMESTAMP,
        CONSTRAINT "FK_friendships_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_friendships_addressee" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_friendships_pair" UNIQUE ("requesterId", "addresseeId"),
        CONSTRAINT "CHK_friendships_not_self" CHECK ("requesterId" <> "addresseeId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_friendships_addressee_status" ON "friendships" ("addresseeId", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_friendships_requester_status" ON "friendships" ("requesterId", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "friendships";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "friendships_status_enum";`);
  }
}
