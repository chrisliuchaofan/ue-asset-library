import { Module } from '@nestjs/common';
import { ModelAdapterService } from './model-adapter.service';
import { AiController } from './ai.controller';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [StorageModule, JobsModule],
  providers: [ModelAdapterService],
  controllers: [AiController],
  exports: [ModelAdapterService],
})
export class AiModule {}

