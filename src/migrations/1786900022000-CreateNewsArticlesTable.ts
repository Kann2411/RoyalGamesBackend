import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNewsArticlesTable1786900022000 implements MigrationInterface {
  name = 'CreateNewsArticlesTable1786900022000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "news_articles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "titulo" VARCHAR NOT NULL,
        "texto" TEXT NOT NULL,
        "tag" VARCHAR NOT NULL,
        "imageUrl" VARCHAR NULL,
        "imagePublicId" VARCHAR NULL,
        "authorId" UUID NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_news_articles_author'
        ) THEN
          ALTER TABLE "news_articles"
            ADD CONSTRAINT "FK_news_articles_author"
            FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_news_articles_created_at" ON "news_articles" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "news_articles";`);
  }
}
