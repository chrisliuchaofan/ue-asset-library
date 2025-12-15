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
   * 用户登录（优先使用数据库验证）
   * 
   * 登录策略：
   * 1. 优先从数据库验证（需要数据库中有用户且密码匹配）
   * 2. 如果数据库验证失败，在生产环境直接拒绝
   * 3. 在开发环境，可以回退到白名单验证（仅用于开发调试）
   */
  async login(email: string, password: string, isAdmin: boolean = false) {
    // 优先使用数据库验证
    try {
      const result = await this.usersService.login(email, password);
      
      // 数据库验证成功，检查用户是否是管理员
      const userIsAdmin = isAdmin || this.isAdmin(result.user.email);
      
      return {
        success: true,
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        token: result.token,
        isAdmin: userIsAdmin,
      };
    } catch (error) {
      // 数据库验证失败
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // 生产环境：直接拒绝，不允许白名单登录
      if (!isDevelopment) {
        throw new UnauthorizedException('邮箱或密码错误');
      }
      
      // 开发环境：可以回退到白名单验证（仅用于开发调试）
      console.warn(`[AuthService] 数据库验证失败，尝试白名单验证（仅开发环境）: ${email}`);
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
        // 开发环境白名单用户登录成功
        console.warn(`[AuthService] ⚠️ 使用白名单登录（仅开发环境）: ${email}`);
        
        // 确保数据库中有该用户（用于积分系统）
        try {
          const existingUser = await this.usersService.findByEmail(email);
          if (!existingUser) {
            console.log(`[AuthService] 白名单用户登录: ${email}，但数据库中不存在，CreditsService 会在初始化时创建`);
          }
        } catch (error) {
          console.warn(`[AuthService] 查询用户失败: ${email}`, error);
        }
        
        const token = jwt.sign(
          { userId: email, email, isAdmin: isAdmin || true },
          this.jwtSecret,
          { expiresIn: '30d' }
        );
        return {
          success: true,
          userId: email,
          email,
          name: email.split('@')[0],
          token,
          isAdmin: isAdmin || true,
        };
      }
      
      // 白名单验证也失败，返回错误
      throw new UnauthorizedException('邮箱或密码错误');
    }
  }

  /**
   * 检查用户是否是管理员
   */
  private isAdmin(email: string): boolean {
    const adminUsersEnv = process.env.ADMIN_USERS || process.env.ADMIN_WHITELIST || process.env.USER_WHITELIST || '';
    if (!adminUsersEnv) return false;
    
    const adminEmails = adminUsersEnv.split(',').map(user => {
      const [emailOrUsername] = user.split(':');
      return emailOrUsername.trim();
    });
    
    return adminEmails.some(adminEmail => {
      const emailUsername = email.split('@')[0];
      const adminEmailUsername = adminEmail.includes('@') 
        ? adminEmail.split('@')[0] 
        : adminEmail;
      return adminEmail === email || adminEmailUsername === emailUsername;
    });
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

