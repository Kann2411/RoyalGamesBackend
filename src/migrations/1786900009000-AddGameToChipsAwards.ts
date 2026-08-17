import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGameToChipsAwards1786900009000 implements MigrationInterface {
  name = 'AddGameToChipsAwards1786900009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chips_awards" ADD COLUMN IF NOT EXISTS "game" VARCHAR(50);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chips_awards_game" ON "chips_awards" ("game");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chips_awards_game";`);
    await queryRunner.query(`ALTER TABLE "chips_awards" DROP COLUMN IF EXISTS "game";`);
  }
}
