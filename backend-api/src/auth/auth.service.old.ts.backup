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
    
    // 尝试精确匹配
    let user = whitelist.find(
      (u) => u.email === email && u.password === password
    );
    
    // 如果精确匹配失败，尝试匹配用户名部分（兼容 username@admin.local 格式）
    if (!user) {
      const emailUsername = email.split('@')[0];
      user = whitelist.find(
        (u) => {
          const whitelistEmail = u.email.trim();
          const whitelistUsername = whitelistEmail.split('@')[0];
          // 匹配规则：
          // 1. whitelist 的 email 用户名部分匹配
          // 2. whitelist 的 email 完全等于请求的 email 用户名部分（兼容 admin:password 格式）
          return (whitelistUsername === emailUsername || whitelistEmail === emailUsername) && u.password === password;
        }
      );
    }

    if (user) {
      // 生成 JWT token（使用原始 email，保持一致性）
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

    // 调试信息：不暴露密码，但显示匹配尝试
    console.warn('[AuthService] 登录失败:', {
      email,
      whitelistEmails: whitelist.map(u => u.email),
      whitelistCount: whitelist.length,
    });

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

