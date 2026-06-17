import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePromoCodesTable1718556002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const promoTablesExists = await queryRunner.hasTable('promo_codes');
    const junctionTableExists = await queryRunner.hasTable('user_promo_codes');
    
    // Create the promo_codes table if it doesn't exist
    if (!promoTablesExists) {
      await queryRunner.createTable(
        new Table({
          name: 'promo_codes',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              generationStrategy: 'uuid',
              default: 'gen_random_uuid()',
            },
            {
              name: 'code',
              type: 'varchar',
              length: '50',
              isUnique: true,
              isNullable: false,
            },
            {
              name: 'type',
              type: 'enum',
              enum: ['chips', 'percentage', 'free_spin', 'bonus'],
              default: "'chips'",
            },
            {
              name: 'rewardAmount',
              type: 'bigint',
              isNullable: false,
            },
            {
              name: 'description',
              type: 'varchar',
              isNullable: true,
            },
            {
              name: 'maxUses',
              type: 'int',
              default: 0,
            },
            {
              name: 'usedCount',
              type: 'int',
              default: 0,
            },
            {
              name: 'usesPerUser',
              type: 'int',
              default: 1,
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
            },
            {
              name: 'expiresAt',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'startsAt',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'createdBy',
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
          ],
        }),
        true,
      );

      // Create indices for better query performance
      await queryRunner.createIndex(
        'promo_codes',
        new TableIndex({
          name: 'IDX_PROMO_CODE',
          columnNames: ['code'],
        }),
      );

      await queryRunner.createIndex(
        'promo_codes',
        new TableIndex({
          name: 'IDX_PROMO_ACTIVE',
          columnNames: ['isActive'],
        }),
      );

      await queryRunner.createIndex(
        'promo_codes',
        new TableIndex({
          name: 'IDX_PROMO_EXPIRES',
          columnNames: ['expiresAt'],
        }),
      );
    }

    // Create the junction table for user_promo_codes if it doesn't exist
    if (!junctionTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'user_promo_codes',
          columns: [
            {
              name: 'promoCodeId',
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
        'user_promo_codes',
        new TableForeignKey({
          columnNames: ['promoCodeId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'promo_codes',
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'user_promo_codes',
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
    const junctionTable = await queryRunner.getTable('user_promo_codes');
    if (junctionTable) {
      const foreignKeys = junctionTable.foreignKeys;
      for (const fk of foreignKeys) {
        try {
          await queryRunner.dropForeignKey('user_promo_codes', fk);
        } catch (err) {
          // FK might not exist, continue
        }
      }
      await queryRunner.dropTable('user_promo_codes');
    }

    const promoCodesTable = await queryRunner.getTable('promo_codes');
    if (promoCodesTable) {
      try {
        await queryRunner.dropIndex('promo_codes', 'IDX_PROMO_CODE');
      } catch (err) {
        // Index might not exist, continue
      }
      try {
        await queryRunner.dropIndex('promo_codes', 'IDX_PROMO_ACTIVE');
      } catch (err) {
        // Index might not exist, continue
      }
      try {
        await queryRunner.dropIndex('promo_codes', 'IDX_PROMO_EXPIRES');
      } catch (err) {
        // Index might not exist, continue
      }
      await queryRunner.dropTable('promo_codes');
    }
  }
}
