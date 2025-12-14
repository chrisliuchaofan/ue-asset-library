import { Module } from '@nestjs/common';
import { ModelAdapterService } from './model-adapter.service';
import { AiController } from './ai.controller';

@Module({
  providers: [ModelAdapterService],
  controllers: [AiController],
  exports: [ModelAdapterService],
})
export class AiModule {}

