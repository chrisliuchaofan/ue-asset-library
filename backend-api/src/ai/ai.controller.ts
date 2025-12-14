import { Controller, Post, Body, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ModelAdapterService, GenerateContentOptions } from './model-adapter.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { validatePresetParams, getAllPresets, getPreset } from './model-presets';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private modelAdapterService: ModelAdapterService) {}

  /**
   * 获取所有可用的模型预设（用于前端展示）
   */
  @Get('presets')
  async getPresets() {
    return {
      presets: getAllPresets(),
    };
  }

  /**
   * 生成文本（必须使用预设，禁止自由指定参数）
   */
  @Post('generate-text')
  async generateText(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      prompt: string;
      presetId: string; // 必须使用预设ID
      systemPrompt?: string; // 可选：覆盖预设的 systemPrompt
      // 以下参数在生产环境被忽略，必须使用预设值
      provider?: 'qwen' | 'siliconflow' | 'ollama';
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    // ✅ 生产环境参数白名单：必须使用预设
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // 生产环境：严格验证预设
      if (!body.presetId) {
        throw new HttpException(
          '生产环境必须使用 presetId，禁止自由指定参数',
          HttpStatus.BAD_REQUEST
        );
      }

      const validation = validatePresetParams(body.presetId, {
        provider: body.provider,
        model: body.model,
        maxTokens: body.maxTokens,
        temperature: body.temperature,
      });

      if (!validation.valid) {
        throw new HttpException(
          validation.error || '参数验证失败',
          HttpStatus.BAD_REQUEST
        );
      }

      // 使用预设的参数
      const preset = validation.preset!;
      const options: GenerateContentOptions & { provider?: any } = {
        provider: preset.provider,
        model: preset.model,
        systemPrompt: body.systemPrompt || preset.systemPrompt,
        maxTokens: preset.maxTokens,
        temperature: preset.temperature,
      };

      const result = await this.modelAdapterService.generateContent(body.prompt, options);

      return {
        text: result.text,
        raw: result.raw,
        preset: {
          id: preset.id,
          name: preset.name,
        },
      };
    } else {
      // 开发环境：允许自由指定参数（向后兼容）
      const preset = body.presetId ? getPreset(body.presetId) : null;
      
      const options: GenerateContentOptions & { provider?: any } = {
        provider: preset?.provider || body.provider,
        model: preset?.model || body.model,
        systemPrompt: body.systemPrompt || preset?.systemPrompt,
        maxTokens: preset?.maxTokens || body.maxTokens,
        temperature: preset?.temperature ?? body.temperature,
      };

      const result = await this.modelAdapterService.generateContent(body.prompt, options);

      return {
        text: result.text,
        raw: result.raw,
        preset: preset ? { id: preset.id, name: preset.name } : null,
      };
    }
  }
}

