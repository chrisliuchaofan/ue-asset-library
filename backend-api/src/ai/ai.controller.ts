import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ModelAdapterService, GenerateContentOptions } from './model-adapter.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private modelAdapterService: ModelAdapterService) {}

  @Post('generate-text')
  async generateText(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      prompt: string;
      provider?: 'qwen' | 'siliconflow' | 'ollama';
      model?: string;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    const options: GenerateContentOptions & { provider?: any } = {
      provider: body.provider,
      model: body.model,
      systemPrompt: body.systemPrompt,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    };

    const result = await this.modelAdapterService.generateContent(body.prompt, options);

    return {
      text: result.text,
      raw: result.raw,
    };
  }
}

