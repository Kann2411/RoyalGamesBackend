import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWithdrawalsTable1718556000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('withdrawals');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'withdrawals',
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
              name: 'amount',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
              default: "'pending'",
            },
            {
              name: 'method',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'bankAccount',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'accountHolder',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'bankName',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'transactionHash',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'rejectionReason',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'notes',
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
          'withdrawals',
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
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('withdrawals');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('withdrawals', foreignKey);
      }
      await queryRunner.dropTable('withdrawals');
    }
  }
}
