import { Controller, Post, Body, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ModelAdapterService, GenerateContentOptions } from './model-adapter.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { validatePresetParams, getAllPresets, getPreset } from './model-presets';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(
    private modelAdapterService: ModelAdapterService,
    private storageService: StorageService,
    private jobsService: JobsService,
  ) {}

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

  /**
   * 生成图片（必须上传到 OSS）
   * 注意：当前实现接收图片 URL，下载后上传到 OSS
   * TODO: 后续可以改为后端直接调用 AI API 生成图片
   */
  @Post('generate-image')
  async generateImage(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      prompt: string;
      size?: string; // 如 '1024*1024'
      referenceImageUrl?: string;
      aspectRatio?: string;
      style?: string;
      provider?: string;
      imageUrl?: string; // 如果已生成，直接提供 URL
    }
  ) {
    // 如果提供了 imageUrl，直接上传到 OSS
    if (body.imageUrl) {
      try {
        // 创建临时 Job 用于跟踪
        const job = await this.jobsService.create({
          userId: user.userId,
          type: 'image_generation',
          input: {
            prompt: body.prompt,
            imageUrl: body.imageUrl,
          },
        });

        // 上传到 OSS
        const jobOutput = await this.storageService.uploadJobOutputFromSource(
          user.userId,
          job.id,
          'image',
          body.imageUrl,
          {
            format: 'jpg',
          }
        );

        // 完成任务
        await this.jobsService.complete(job.id, {
          output: {
            imageUrl: jobOutput.ossUrl,
          },
          creditCost: 0, // 如果已经计费，这里设为 0
          transactionId: '',
        });

        return {
          imageUrl: jobOutput.ossUrl,
        };
      } catch (error: any) {
        throw new HttpException(
          `上传图片到 OSS 失败: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }

    // TODO: 实现后端直接生成图片的逻辑
    throw new HttpException(
      '暂不支持后端直接生成图片，请提供 imageUrl',
      HttpStatus.NOT_IMPLEMENTED
    );
  }

  /**
   * 生成视频（必须上传到 OSS）
   * 注意：当前实现接收视频 URL，下载后上传到 OSS
   * TODO: 后续可以改为后端直接调用 AI API 生成视频
   */
  @Post('generate-video')
  async generateVideo(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      type: 'video';
      imageUrl: string;
      prompt: string;
      duration?: number;
      resolution?: string;
      provider?: string;
      videoUrl?: string; // 如果已生成，直接提供 URL
    }
  ) {
    // 如果提供了 videoUrl，直接上传到 OSS
    if (body.videoUrl) {
      try {
        // 创建临时 Job 用于跟踪
        const job = await this.jobsService.create({
          userId: user.userId,
          type: 'video_generation',
          input: {
            prompt: body.prompt,
            imageUrl: body.imageUrl,
            videoUrl: body.videoUrl,
          },
        });

        // 上传到 OSS
        const jobOutput = await this.storageService.uploadJobOutputFromSource(
          user.userId,
          job.id,
          'video',
          body.videoUrl,
          {
            format: 'mp4',
            duration: body.duration,
          }
        );

        // 完成任务
        await this.jobsService.complete(job.id, {
          output: {
            videoUrl: jobOutput.ossUrl,
          },
          creditCost: 0, // 如果已经计费，这里设为 0
          transactionId: '',
        });

        return {
          videoUrl: jobOutput.ossUrl,
        };
      } catch (error: any) {
        throw new HttpException(
          `上传视频到 OSS 失败: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }

    // TODO: 实现后端直接生成视频的逻辑
    throw new HttpException(
      '暂不支持后端直接生成视频，请提供 videoUrl',
      HttpStatus.NOT_IMPLEMENTED
    );
  }
}

