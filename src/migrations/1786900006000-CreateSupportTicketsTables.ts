import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportTicketsTables1786900006000 implements MigrationInterface {
  name = 'CreateSupportTicketsTables1786900006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_tickets_status_enum') THEN
          CREATE TYPE "support_tickets_status_enum" AS ENUM ('open', 'answered', 'closed');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "subject" VARCHAR(200) NOT NULL,
        "status" "support_tickets_status_enum" NOT NULL DEFAULT 'open',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_support_tickets_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_messages_sender_enum') THEN
          CREATE TYPE "support_ticket_messages_sender_enum" AS ENUM ('user', 'admin', 'system');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticketId" UUID NOT NULL,
        "senderId" UUID,
        "senderRole" "support_ticket_messages_sender_enum" NOT NULL,
        "content" VARCHAR(4000) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_support_ticket_messages_ticket" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_support_ticket_messages_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_tickets_user_updated" ON "support_tickets" ("userId", "updatedAt");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_ticket_messages_ticket_created" ON "support_ticket_messages" ("ticketId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "support_ticket_messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "support_ticket_messages_sender_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "support_tickets_status_enum";`);
  }
}
