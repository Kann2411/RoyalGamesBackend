import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBannerSlidesTable1786900025000 implements MigrationInterface {
  name = 'CreateBannerSlidesTable1786900025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "banner_slides" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "imageUrl" VARCHAR NOT NULL,
        "imagePublicId" VARCHAR NOT NULL,
        "createdBy" UUID NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_banner_slides_created_by'
        ) THEN
          ALTER TABLE "banner_slides"
            ADD CONSTRAINT "FK_banner_slides_created_by"
            FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "banner_slides";`);
  }
}
