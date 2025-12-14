import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('log_entries')
@Index(['userId', 'createdAt'])
@Index(['logType', 'createdAt'])
export class LogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  action: string; // 操作类型，如 'jimeng_video_generation', 'qwen_text_generation'

  @Column({
    type: 'enum',
    enum: ['business', 'system'],
    default: 'business',
  })
  logType: 'business' | 'system'; // 日志类型：业务日志或系统日志

  @Column({
    type: 'enum',
    enum: ['info', 'warn', 'error'],
    nullable: true,
  })
  level: 'info' | 'warn' | 'error'; // 日志级别（主要用于系统日志）

  @Column('jsonb', { nullable: true })
  details: any; // 详细信息（JSON格式）

  @Column({ default: true })
  success: boolean; // 是否成功

  @Column({ type: 'timestamp', nullable: true })
  timestamp: Date; // 操作时间戳

  @CreateDateColumn()
  createdAt: Date;
}

