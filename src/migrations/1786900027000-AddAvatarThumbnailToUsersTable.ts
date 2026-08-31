import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarThumbnailToUsersTable1786900027000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarThumbBin = await queryRunner.hasColumn('users', 'avatar_thumb_bin');
    if (!hasAvatarThumbBin) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_thumb_bin" bytea`);
    }

    const hasAvatarThumbMime = await queryRunner.hasColumn('users', 'avatar_thumb_mime');
    if (!hasAvatarThumbMime) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_thumb_mime" varchar`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasAvatarThumbMime = await queryRunner.hasColumn('users', 'avatar_thumb_mime');
    if (hasAvatarThumbMime) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_thumb_mime"`);
    }

    const hasAvatarThumbBin = await queryRunner.hasColumn('users', 'avatar_thumb_bin');
    if (hasAvatarThumbBin) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_thumb_bin"`);
    }
  }
}
