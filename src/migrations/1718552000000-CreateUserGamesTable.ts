import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateUserGamesTable1718552000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.hasTable('user_games');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'user_games',
          columns: [
            {
              name: 'gameId',
              type: 'uuid',
              isPrimary: true,
            },
            {
              name: 'userId',
              type: 'uuid',
              isPrimary: true,
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'user_games',
        new TableForeignKey({
          columnNames: ['gameId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'games',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'user_games',
        new TableForeignKey({
          columnNames: ['userId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_games');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('user_games', fk);
      }
      await queryRunner.dropTable('user_games');
    }
  }
}
