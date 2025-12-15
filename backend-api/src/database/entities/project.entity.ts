import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Project 实体 - 存储 Dream Factory 项目数据
 */
@Entity('projects')
@Index(['userId', 'createdAt'])
@Index(['userId', 'updatedAt'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string; // 项目所属用户 ID

  @Column()
  title: string; // 项目标题

  @Column('text')
  originalIdea: string; // 原始创意

  @Column('jsonb', { nullable: true })
  selectedConcept: {
    id: string;
    title: string;
    description: string;
    tone: string;
  } | null; // 选中的概念

  @Column('jsonb')
  storyboard: Array<{
    id: number;
    description: string;
    visualPrompt: string;
    voiceoverScript: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    referenceAssetId?: string;
    referenceAssetUrl?: string;
    videoOperationId?: string;
    isGeneratingImage: boolean;
    isGeneratingVideo: boolean;
    isGeneratingAudio: boolean;
  }>; // 故事板场景列表

  @Column('text', { nullable: true })
  mergedVideoUrl?: string; // 合并后的视频 URL

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date; // 完成时间
}

