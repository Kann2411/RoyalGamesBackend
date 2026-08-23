import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export const NEWS_TAGS = ['Lanzamiento', 'Juegos', 'Promoción', 'Novedad'] as const;
export type NewsTag = (typeof NEWS_TAGS)[number];

@Entity('news_articles')
export class NewsArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  titulo: string;

  @Column({ type: 'text' })
  texto: string;

  @Column({ type: 'varchar' })
  tag: NewsTag;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  imagePublicId: string | null;

  @Column({ type: 'uuid', nullable: true })
  authorId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
