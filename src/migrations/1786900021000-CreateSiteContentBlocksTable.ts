import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSiteContentBlocksTable1786900021000 implements MigrationInterface {
  name = 'CreateSiteContentBlocksTable1786900021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_content_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR NOT NULL,
        "type" VARCHAR NOT NULL,
        "textValue" TEXT NULL,
        "imageUrl" VARCHAR NULL,
        "imagePublicId" VARCHAR NULL,
        "updatedBy" UUID NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_site_content_blocks_key" UNIQUE ("key")
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_site_content_blocks_updated_by'
        ) THEN
          ALTER TABLE "site_content_blocks"
            ADD CONSTRAINT "FK_site_content_blocks_updated_by"
            FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "site_content_blocks";`);
  }
}
