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
export declare class ProjectsService {
    private projectRepository;
    constructor(projectRepository: Repository<Project>);
    create(userId: string, dto: CreateProjectDto): Promise<Project>;
    findAllByUser(userId: string): Promise<Project[]>;
    findOne(id: string, userId: string): Promise<Project>;
    update(id: string, userId: string, dto: UpdateProjectDto): Promise<Project>;
    remove(id: string, userId: string): Promise<void>;
}
