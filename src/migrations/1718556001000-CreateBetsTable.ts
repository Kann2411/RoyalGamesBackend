import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateBetsTable1718556001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('bets');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'bets',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'userId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'gameId',
              type: 'uuid',
              isNullable: true,
            },
            {
              name: 'betAmount',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'winAmount',
              type: 'bigint',
              isNullable: true,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'won', 'lost', 'cancelled'],
              default: "'pending'",
            },
            {
              name: 'multiplier',
              type: 'float',
              isNullable: true,
            },
            {
              name: 'serverSeed',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'clientSeed',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'nonce',
              type: 'int',
              default: 0,
            },
            {
              name: 'gameData',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'gameResult',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'ipAddress',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'deviceInfo',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'now()',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'now()',
            },
            {
              name: 'completedAt',
              type: 'timestamp',
              isNullable: true,
            },
          ],
        }),
        true,
      );

      try {
        await queryRunner.createForeignKey(
          'bets',
          new TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      } catch (err) {
        // FK might already exist, continue
      }

      try {
        await queryRunner.createForeignKey(
          'bets',
          new TableForeignKey({
            columnNames: ['gameId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'games',
            onDelete: 'SET NULL',
          }),
        );
      } catch (err) {
        // FK might already exist, continue
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('bets');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        try {
          await queryRunner.dropForeignKey('bets', fk);
        } catch (err) {
          // FK might not exist, continue
        }
      }
      await queryRunner.dropTable('bets');
    }
  }
}
