import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarBinaryToUsersTable1719992000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_bin" bytea`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_mime" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_mime"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_bin"`);
  }
}
