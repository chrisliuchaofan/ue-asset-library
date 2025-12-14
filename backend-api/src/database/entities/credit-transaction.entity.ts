import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('credit_transactions')
@Index(['userId', 'createdAt'])
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
  transactionId: string; // 外部交易ID

  @Column({ nullable: true })
  description: string; // 交易描述

  @Column()
  balanceAfter: number; // 交易后余额

  @CreateDateColumn()
  createdAt: Date;
}

