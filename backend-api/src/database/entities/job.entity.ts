import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Job 实体 - 生成任务管理
 * 支持异步任务、重试、状态追踪
 */
@Entity('jobs')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  type: string; // 'text_generation', 'image_generation', 'video_generation', 'audio_generation'

  @Column({
    type: 'enum',
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued',
  })
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @Column('jsonb', { nullable: true })
  input: any; // 输入参数（prompt, model, options 等）

  @Column('jsonb', { nullable: true })
  output: any; // 输出结果（生成的文本、图片URL等）

  @Column('jsonb', { nullable: true })
  error: any; // 错误信息（如果失败）

  @Column({ type: 'int', nullable: true })
  creditCost: number; // 消耗的积分

  @Column({ nullable: true })
  transactionId: string; // 关联的积分交易ID

  @Column({ nullable: true })
  provider: string; // 使用的模型提供商（qwen, siliconflow, ollama等）

  @Column({ nullable: true })
  model: string; // 使用的具体模型名称

  @Column({ type: 'int', default: 0 })
  retryCount: number; // 重试次数

  @Column({ type: 'int', nullable: true })
  estimatedCost: number; // 预估成本（用于预检查）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

