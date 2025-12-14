import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn()
  id: string; // 使用邮箱作为 ID

  @Column()
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column()
  passwordHash: string; // bcrypt 加密后的密码

  @Column({ default: 0 })
  credits: number; // 积分余额

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

