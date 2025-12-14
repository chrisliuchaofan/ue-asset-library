import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

  /**
   * 从环境变量读取用户白名单
   */
  private getWhitelistUsers(): Array<{ email: string; password: string }> {
    const usersEnv = process.env.USER_WHITELIST || '';
    if (!usersEnv) return [];

    return usersEnv.split(',').map((user) => {
      const [email, password] = user.split(':');
      return { email: email.trim(), password: password.trim() };
    });
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string) {
    // 方式1：检查环境变量白名单
    const whitelist = this.getWhitelistUsers();
    const user = whitelist.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      // 生成 JWT token
      const token = jwt.sign(
        { userId: email, email },
        this.jwtSecret,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        userId: email,
        email,
        name: email.split('@')[0],
        token,
      };
    }

    // 方式2：从数据库验证（如果使用数据库）
    // TODO: 实现数据库验证逻辑
    // const dbUser = await this.userRepository.findOne({ email });
    // if (dbUser && await bcrypt.compare(password, dbUser.password)) {
    //   const token = jwt.sign({ userId: dbUser.id, email }, this.jwtSecret);
    //   return { success: true, userId: dbUser.id, email, token };
    // }

    throw new UnauthorizedException('邮箱或密码错误');
  }

  /**
   * 验证 Token
   */
  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      return {
        valid: false,
      };
    }
  }
}

