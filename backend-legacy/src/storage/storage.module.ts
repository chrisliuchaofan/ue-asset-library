import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { StorageService } from './storage.service';
import { StorageCleanupService } from './storage-cleanup.service';
import { JobOutput } from '../database/entities/job-output.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobOutput]),
    ScheduleModule.forRoot(),
  ],
  providers: [StorageService, StorageCleanupService],
  exports: [StorageService, StorageCleanupService],
})
export class StorageModule {}

