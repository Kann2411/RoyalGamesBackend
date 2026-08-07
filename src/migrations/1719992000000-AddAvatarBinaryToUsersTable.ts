import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarBinaryToUsersTable1719992000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarBin = await queryRunner.hasColumn('users', 'avatar_bin');
    if (!hasAvatarBin) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_bin" bytea`);
    }

    const hasAvatarMime = await queryRunner.hasColumn('users', 'avatar_mime');
    if (!hasAvatarMime) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_mime" varchar`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarMime = await queryRunner.hasColumn('users', 'avatar_mime');
    if (hasAvatarMime) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_mime"`);
    }

    const hasAvatarBin = await queryRunner.hasColumn('users', 'avatar_bin');
    if (hasAvatarBin) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_bin"`);
    }
  }
}
