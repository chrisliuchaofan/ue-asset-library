import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    create(user: {
        userId: string;
        email: string;
    }, dto: CreateProjectDto): Promise<import("../database/entities/project.entity").Project>;
    findAll(user: {
        userId: string;
        email: string;
    }): Promise<import("../database/entities/project.entity").Project[]>;
    findOne(user: {
        userId: string;
        email: string;
    }, id: string): Promise<import("../database/entities/project.entity").Project>;
    update(user: {
        userId: string;
        email: string;
    }, id: string, dto: UpdateProjectDto): Promise<import("../database/entities/project.entity").Project>;
    remove(user: {
        userId: string;
        email: string;
    }, id: string): Promise<{
        success: boolean;
    }>;
}
