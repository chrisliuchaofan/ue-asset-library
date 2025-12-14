import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('credit_transactions')
@Index(['userId', 'createdAt']) // 性能索引：用于每日额度计算
@Unique(['userId', 'refId', 'action']) // 幂等约束：确保同一个 refId + action 只能扣费一次
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  amount: number; // 正数为充值，负数为消费

  @Column()
  action: string; // 操作类型，如 'jimeng_video_generation', 'qwen_text_generation'

  @Column({ nullable: true })
  refId: string; // 引用ID（如 jobId），用于幂等性检查

  @Column({ nullable: true })
  transactionId: string; // 外部交易ID

  @Column({ nullable: true })
  description: string; // 交易描述

  @Column()
  balanceAfter: number; // 交易后余额

  @CreateDateColumn()
  createdAt: Date;
}

