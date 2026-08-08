import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleIdToUsers1783467622917 implements MigrationInterface {
    name = 'AddGoogleIdToUsers1783467622917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // IF EXISTS/IF NOT EXISTS: this DB's schema has drifted from the migration history
        // (the app fell back to synchronize() on past failed deploys), so these columns may or
        // may not already be in the state a previous run of this migration would have left them.
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId"`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" character varying`);
    }

}
