import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessagesTable1786900002000 implements MigrationInterface {
  name = 'CreateMessagesTable1786900002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "senderId" UUID NOT NULL,
        "recipientId" UUID NOT NULL,
        "content" VARCHAR(2000) NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_messages_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_sender_recipient_created" ON "messages" ("senderId", "recipientId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_recipient_sender_created" ON "messages" ("recipientId", "senderId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_recipient_unread" ON "messages" ("recipientId", "read");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages";`);
  }
}
