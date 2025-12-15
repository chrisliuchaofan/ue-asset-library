import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { JobOutput } from '../database/entities/job-output.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobOutput])],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}

