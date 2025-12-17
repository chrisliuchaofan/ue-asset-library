import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 管理员权限守卫
 * 检查用户是否在管理员白名单中
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 从 AuthGuard 中获取的用户信息

    if (!user || !user.email) {
      throw new ForbiddenException('未登录，请先登录');
    }

    // 检查管理员白名单
    const adminUsers = process.env.ADMIN_USERS || process.env.USER_WHITELIST || '';
    const adminEmails = adminUsers
      .split(',')
      .map((u: string) => u.split(':')[0].trim())
      .filter((email: string) => email.length > 0);

    // 检查用户邮箱是否在管理员列表中
    const isAdmin = adminEmails.includes(user.email);

    if (!isAdmin) {
      throw new ForbiddenException('权限不足，需要管理员权限');
    }

    return true;
  }
}







