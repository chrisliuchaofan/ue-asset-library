import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * JobOutput 实体 - 生成产物存储
 * 所有图片/视频必须上传到 OSS，数据库仅保存引用
 */
@Entity('job_outputs')
@Index(['jobId', 'type'])
@Index(['userId', 'createdAt'])
export class JobOutput {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  jobId: string; // 关联的 Job ID

  @Column()
  @Index()
  userId: string; // 用户 ID（冗余字段，便于查询）

  @Column({
    type: 'enum',
    enum: ['image', 'video'],
  })
  type: 'image' | 'video'; // 产物类型

  @Column()
  ossUrl: string; // OSS 完整 URL（用于访问）

  @Column()
  ossPath: string; // OSS 路径（users/{userId}/jobs/{jobId}/{type}-{timestamp}.{ext}）

  @Column({ type: 'bigint' })
  size: number; // 文件大小（字节）

  @Column('jsonb', { nullable: true })
  meta: {
    width?: number; // 图片宽度
    height?: number; // 图片高度
    duration?: number; // 视频时长（秒）
    format?: string; // 文件格式（jpg, png, mp4 等）
    [key: string]: any; // 其他元数据
  } | null;

  @CreateDateColumn()
  createdAt: Date;
}







