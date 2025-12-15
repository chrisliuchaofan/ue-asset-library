import { Controller, Get, Post, Body, Query, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { RedeemCodesService } from './redeem-codes.service';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('credits/redeem-codes')
@UseGuards(AuthGuard)
export class RedeemCodesController {
  constructor(private redeemCodesService: RedeemCodesService) {}

  /**
   * 验证兑换码（用户）
   * GET /credits/redeem-codes/:code/validate
   */
  @Get(':code/validate')
  async validateCode(@Param('code') code: string) {
    try {
      const redeemCode = await this.redeemCodesService.validateCode(code);
      return {
        valid: true,
        amount: redeemCode.amount,
        expiresAt: redeemCode.expiresAt,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('验证兑换码失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 使用兑换码（用户）
   * POST /credits/redeem-codes/:code/redeem
   */
  @Post(':code/redeem')
  async redeemCode(
    @CurrentUser() user: { userId: string; email: string },
    @Param('code') code: string,
  ) {
    try {
      return await this.redeemCodesService.redeemCode(code, user.userId);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('使用兑换码失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 生成兑换码（管理员）
   * POST /credits/admin/redeem-codes/generate
   */
  @Post('admin/generate')
  @UseGuards(AdminGuard)
  async generateCodes(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      amount: number;
      count?: number;
      expiresAt?: string; // ISO 8601 格式
      note?: string;
    },
  ) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
    const codes = await this.redeemCodesService.generateCodes(
      body.amount,
      body.count || 1,
      expiresAt,
      body.note,
    );

    return {
      codes: codes.map((code) => ({
        code: code.code,
        amount: code.amount,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      })),
      count: codes.length,
    };
  }

  /**
   * 获取兑换码列表（管理员）
   * GET /credits/admin/redeem-codes
   */
  @Get('admin')
  @UseGuards(AdminGuard)
  async getCodes(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('used') usedStr?: string,
    @Query('disabled') disabledStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
    const used = usedStr === 'true' ? true : usedStr === 'false' ? false : undefined;
    const disabled = disabledStr === 'true' ? true : disabledStr === 'false' ? false : undefined;

    return await this.redeemCodesService.getCodes({
      page,
      pageSize,
      used,
      disabled,
    });
  }

  /**
   * 禁用兑换码（管理员）
   * POST /credits/admin/redeem-codes/:code/disable
   */
  @Post('admin/:code/disable')
  @UseGuards(AdminGuard)
  async disableCode(
    @CurrentUser() user: { userId: string; email: string },
    @Param('code') code: string,
  ) {
    await this.redeemCodesService.disableCode(code, user.userId);
    return { success: true, message: '兑换码已禁用' };
  }

  /**
   * 获取兑换码统计信息（管理员）
   * GET /credits/admin/redeem-codes/statistics
   */
  @Get('admin/statistics')
  @UseGuards(AdminGuard)
  async getStatistics() {
    return await this.redeemCodesService.getStatistics();
  }
}


