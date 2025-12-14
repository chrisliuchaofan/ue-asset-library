import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 从 JWT token 中解析用户信息（AuthGuard 已设置 request.user）
 * 
 * 使用方式：
 * @Get('balance')
 * async getBalance(@CurrentUser() user: { userId: string; email: string }) {
 *   return this.service.getBalance(user.userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // AuthGuard 已经设置了这个
  },
);

