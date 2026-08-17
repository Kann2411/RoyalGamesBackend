import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlocksTable1786900008000 implements MigrationInterface {
  name = 'CreateBlocksTable1786900008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "blockerId" UUID NOT NULL,
        "blockedId" UUID NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_blocks_blocker" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_blocks_blocked" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_blocks_pair" UNIQUE ("blockerId", "blockedId"),
        CONSTRAINT "CHK_blocks_not_self" CHECK ("blockerId" <> "blockedId")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_blocks_blocker" ON "blocks" ("blockerId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_blocks_blocked" ON "blocks" ("blockedId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "blocks";`);
  }
}
