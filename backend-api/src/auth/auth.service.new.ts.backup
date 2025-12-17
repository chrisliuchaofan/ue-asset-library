import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

  constructor(private usersService: UsersService) {}

  /**
   * 从环境变量读取管理员用户白名单（仅用于管理后台）
   */
  private getAdminWhitelistUsers(): Array<{ email: string; password: string }> {
    const usersEnv = process.env.ADMIN_WHITELIST || process.env.USER_WHITELIST || '';
    if (!usersEnv) return [];

    return usersEnv.split(',').map((user) => {
      const [email, password] = user.split(':');
      return { email: email.trim(), password: password.trim() };
    });
  }

  /**
   * 用户登录（支持数据库用户和管理员白名单）
   */
  async login(email: string, password: string, isAdmin: boolean = false) {
    // 如果是管理员登录，先检查白名单
    if (isAdmin) {
      const adminWhitelist = this.getAdminWhitelistUsers();
      const adminUser = adminWhitelist.find(
        (u) => {
          const whitelistEmail = u.email.trim();
          const emailUsername = email.split('@')[0];
          const whitelistUsername = whitelistEmail.includes('@') 
            ? whitelistEmail.split('@')[0] 
            : whitelistEmail;
          return (whitelistEmail === email || whitelistUsername === emailUsername) && u.password === password;
        }
      );

      if (adminUser) {
        const token = jwt.sign(
          { userId: email, email, isAdmin: true },
          this.jwtSecret,
          { expiresIn: '30d' }
        );
        return {
          success: true,
          userId: email,
          email,
          name: email.split('@')[0],
          token,
          isAdmin: true,
        };
      }
    }

    // 尝试从数据库验证（普通用户）
    try {
      const result = await this.usersService.login(email, password);
      return {
        success: true,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        token: result.token,
        isAdmin: false,
      };
    } catch (error) {
      // 数据库登录失败，返回错误
      throw new UnauthorizedException('邮箱或密码错误');
    }
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
        isAdmin: decoded.isAdmin || false,
      };
    } catch (error) {
      return {
        valid: false,
      };
    }
  }
}







