import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarDataToUsersTable1719990000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('users', 'avatarData');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatarData" jsonb`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('users', 'avatarData');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarData"`);
    }
  }
}
