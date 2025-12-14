import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * 用户注册
   */
  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string }) {
    return this.usersService.register(body.email, body.password, body.name);
  }

  /**
   * 用户登录
   */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.usersService.login(body.email, body.password);
  }

  /**
   * 获取当前用户信息（需要认证）
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: { userId: string; email: string }) {
    const dbUser = await this.usersService.findById(user.userId);
    if (!dbUser) {
      throw new Error('用户不存在');
    }
    
    const { passwordHash: _, ...userWithoutPassword } = dbUser;
    return userWithoutPassword;
  }
}

