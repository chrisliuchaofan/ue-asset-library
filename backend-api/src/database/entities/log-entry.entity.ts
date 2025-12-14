import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('log_entries')
@Index(['userId', 'createdAt'])
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  action: string; // 操作类型，如 'jimeng_video_generation', 'qwen_text_generation'

  @Column('jsonb', { nullable: true })
  details: any; // 详细信息（JSON格式）

  @Column({ default: true })
  success: boolean; // 是否成功

  @Column({ type: 'timestamp', nullable: true })
  timestamp: Date; // 操作时间戳

  @CreateDateColumn()
  createdAt: Date;
}

