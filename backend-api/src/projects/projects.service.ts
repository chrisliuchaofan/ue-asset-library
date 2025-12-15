import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/entities/project.entity';

export interface CreateProjectDto {
  title: string;
  originalIdea: string;
  selectedConcept: {
    id: string;
    title: string;
    description: string;
    tone: string;
  } | null;
  storyboard: Array<{
    id: number;
    description: string;
    visualPrompt: string;
    voiceoverScript: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    referenceAssetId?: string;
    referenceAssetUrl?: string;
    videoOperationId?: string;
    isGeneratingImage: boolean;
    isGeneratingVideo: boolean;
    isGeneratingAudio: boolean;
  }>;
  mergedVideoUrl?: string;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  completedAt?: Date;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * 创建项目
   */
  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectRepository.create({
      userId,
      title: dto.title,
      originalIdea: dto.originalIdea,
      selectedConcept: dto.selectedConcept,
      storyboard: dto.storyboard,
      mergedVideoUrl: dto.mergedVideoUrl,
      completedAt: dto.mergedVideoUrl ? new Date() : undefined,
    });

    return await this.projectRepository.save(project);
  }

  /**
   * 获取用户的所有项目
   */
  async findAllByUser(userId: string): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * 根据 ID 获取项目（检查用户权限）
   */
  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('无权访问此项目');
    }

    return project;
  }

  /**
   * 更新项目
   */
  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.findOne(id, userId);

    Object.assign(project, dto);
    if (dto.completedAt !== undefined) {
      project.completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    }

    return await this.projectRepository.save(project);
  }

  /**
   * 删除项目
   */
  async remove(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);
    await this.projectRepository.remove(project);
  }
}

