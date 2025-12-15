import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UsersService {
  private jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * 用户注册
   */
  async register(email: string, password: string, name?: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // 检查用户是否已存在
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      id: email, // 使用邮箱作为 ID
      email,
      name: name || email.split('@')[0],
      passwordHash,
      credits: parseInt(process.env.INITIAL_CREDITS || '100', 10),
    });

    await this.userRepository.save(user);

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '30d' }
    );

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<{ user: Omit<User, 'passwordHash'>; token: string }> {
    // 查找用户
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.jwtSecret,
      { expiresIn: '30d' }
    );

    // 返回用户信息（不包含密码）
    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * 更新用户积分
   */
  async updateCredits(userId: string, credits: number): Promise<void> {
    await this.userRepository.update({ id: userId }, { credits });
  }

  /**
   * 获取用户积分
   */
  async getCredits(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.credits || 0;
  }

  /**
   * 获取所有用户列表（管理员功能）
   */
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    try {
      const users = await this.userRepository.find({
        order: { createdAt: 'DESC' },
      });
      
      if (!users || users.length === 0) {
        console.warn('[UsersService] 用户列表为空，可能数据库中没有用户');
        return [];
      }
      
      return users.map(({ passwordHash: _, ...user }) => user);
    } catch (error) {
      console.error('[UsersService] 获取用户列表失败:', error);
      throw error;
    }
  }
}

