import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformedByToChipsAwards1786900023000 implements MigrationInterface {
  name = 'AddPerformedByToChipsAwards1786900023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chips_awards" ADD COLUMN IF NOT EXISTS "performedBy" UUID;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chips_awards_performed_by" ON "chips_awards" ("performedBy");
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_chips_awards_performed_by'
        ) THEN
          ALTER TABLE "chips_awards" ADD CONSTRAINT "FK_chips_awards_performed_by"
            FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chips_awards" DROP CONSTRAINT IF EXISTS "FK_chips_awards_performed_by";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chips_awards_performed_by";`);
    await queryRunner.query(`ALTER TABLE "chips_awards" DROP COLUMN IF EXISTS "performedBy";`);
  }
}
