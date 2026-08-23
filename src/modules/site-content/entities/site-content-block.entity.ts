import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type SiteContentType = 'text' | 'image';

@Entity('site_content_blocks')
export class SiteContentBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar' })
  type: SiteContentType;

  @Column({ type: 'text', nullable: true })
  textValue: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  imagePublicId: string | null;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
