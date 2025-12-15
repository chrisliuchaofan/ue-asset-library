import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  /**
   * 创建项目
   */
  @Post()
  async create(
    @CurrentUser() user: { userId: string; email: string },
    @Body() dto: CreateProjectDto,
  ) {
    return await this.projectsService.create(user.userId, dto);
  }

  /**
   * 获取用户的所有项目
   */
  @Get()
  async findAll(@CurrentUser() user: { userId: string; email: string }) {
    return await this.projectsService.findAllByUser(user.userId);
  }

  /**
   * 根据 ID 获取项目
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
  ) {
    return await this.projectsService.findOne(id, user.userId);
  }

  /**
   * 更新项目
   */
  @Put(':id')
  async update(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return await this.projectsService.update(id, user.userId, dto);
  }

  /**
   * 删除项目
   */
  @Delete(':id')
  async remove(
    @CurrentUser() user: { userId: string; email: string },
    @Param('id') id: string,
  ) {
    await this.projectsService.remove(id, user.userId);
    return { success: true };
  }
}

