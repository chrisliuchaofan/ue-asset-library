import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * RedeemCode 实体 - 兑换码
 * 支持手动生成与发放，可追踪、可回收、可禁用
 */
@Entity('redeem_codes')
@Index(['used', 'disabled']) // 查询未使用且未禁用的兑换码
@Index(['createdAt']) // 按创建时间查询
export class RedeemCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32, unique: true })
  code: string; // 兑换码（唯一）

  @Column({ type: 'int' })
  amount: number; // 金额（积分）

  @Column({ default: false })
  used: boolean; // 是否已使用

  @Column({ nullable: true })
  @Index()
  usedBy: string | null; // 使用者（userId）

  @Column({ nullable: true })
  usedAt: Date | null; // 使用时间

  @CreateDateColumn()
  createdAt: Date; // 创建时间

  @Column({ nullable: true })
  expiresAt: Date | null; // 过期时间（可选，null 表示永不过期）

  @Column({ default: false })
  disabled: boolean; // 是否禁用（管理员可禁用）

  @Column({ nullable: true })
  disabledAt: Date | null; // 禁用时间

  @Column({ nullable: true })
  disabledBy: string | null; // 禁用者（管理员 userId）

  @Column({ nullable: true, type: 'text' })
  note: string | null; // 备注（可选，用于记录生成原因等）
}

