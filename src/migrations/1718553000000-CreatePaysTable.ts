import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePaysTable1718553000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('pays');
    
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'pays',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'mercadoPagoPaymentId',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'mercadoPagoPreferenceId',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'paymentPlatform',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'price',
              type: 'varchar',
              isNullable: false,
            },
            {
              name: 'chips',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'userId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'approved', 'rejected', 'cancelled'],
              default: "'pending'",
            },
            {
              name: 'date',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
        true,
      );

      await queryRunner.createForeignKey(
        'pays',
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
    const table = await queryRunner.getTable('pays');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('userId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('pays', foreignKey);
      }
      await queryRunner.dropTable('pays');
    }
  }
}
