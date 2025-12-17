import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../credits/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
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

  /**
   * 获取所有用户列表（管理员功能）
   */
  @Get('list')
  @UseGuards(AuthGuard, AdminGuard)
  async getAllUsers(@CurrentUser() user: { userId: string; email: string }) {
    try {
      const users = await this.usersService.findAll();
      return { users };
    } catch (error: any) {
      console.error('[UsersController] 获取用户列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户模式（管理员功能）
   */
  @Post('update-mode')
  @UseGuards(AuthGuard, AdminGuard)
  async updateUserMode(
    @CurrentUser() currentUser: { userId: string; email: string },
    @Body() body: { targetUserId: string; billingMode?: 'DRY_RUN' | 'REAL'; modelMode?: 'DRY_RUN' | 'REAL' },
  ) {
    try {
      if (!body.targetUserId) {
        throw new Error('targetUserId 不能为空');
      }

      const updatedUser = await this.usersService.updateUserMode(
        body.targetUserId,
        body.billingMode,
        body.modelMode,
      );

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      return { success: true, user: userWithoutPassword };
    } catch (error: any) {
      console.error('[UsersController] 更新用户模式失败:', error);
      throw error;
    }
  }
}

