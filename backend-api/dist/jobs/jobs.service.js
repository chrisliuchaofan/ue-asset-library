"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const job_entity_1 = require("../database/entities/job.entity");
const job_schemas_1 = require("./job-schemas");
let JobsService = class JobsService {
    constructor(jobRepository) {
        this.jobRepository = jobRepository;
    }
    async create(data) {
        const inputValidation = (0, job_schemas_1.validateJobInput)(data.type, data.input);
        if (!inputValidation.valid) {
            throw new common_1.HttpException(`任务输入验证失败: ${inputValidation.error}`, common_1.HttpStatus.BAD_REQUEST);
        }
        const job = this.jobRepository.create({
            userId: data.userId,
            type: data.type,
            status: 'queued',
            input: inputValidation.data,
            provider: data.provider,
            model: data.model,
            estimatedCost: data.estimatedCost,
        });
        return await this.jobRepository.save(job);
    }
    async updateStatus(jobId, status) {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.HttpException('任务不存在', common_1.HttpStatus.NOT_FOUND);
        }
        job.status = status;
        return await this.jobRepository.save(job);
    }
    async complete(jobId, data) {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.HttpException('任务不存在', common_1.HttpStatus.NOT_FOUND);
        }
        const outputValidation = (0, job_schemas_1.validateJobOutput)(job.type, data.output);
        if (!outputValidation.valid) {
            throw new common_1.HttpException(`任务输出验证失败: ${outputValidation.error}`, common_1.HttpStatus.BAD_REQUEST);
        }
        job.status = 'completed';
        job.output = outputValidation.data;
        job.creditCost = data.creditCost;
        job.transactionId = data.transactionId;
        return await this.jobRepository.save(job);
    }
    async fail(jobId, error) {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.HttpException('任务不存在', common_1.HttpStatus.NOT_FOUND);
        }
        job.status = 'failed';
        job.error = {
            message: error?.message || '未知错误',
            stack: error?.stack,
            ...error,
        };
        job.retryCount = (job.retryCount || 0) + 1;
        return await this.jobRepository.save(job);
    }
    async getJob(jobId) {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.HttpException('任务不存在', common_1.HttpStatus.NOT_FOUND);
        }
        return job;
    }
    async getUserJobs(userId, limit = 50, status) {
        const query = this.jobRepository
            .createQueryBuilder('job')
            .where('job.userId = :userId', { userId })
            .orderBy('job.createdAt', 'DESC')
            .take(limit);
        if (status) {
            query.andWhere('job.status = :status', { status });
        }
        return await query.getMany();
    }
    async cancel(jobId) {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
            throw new common_1.HttpException('任务不存在', common_1.HttpStatus.NOT_FOUND);
        }
        if (job.status === 'completed' || job.status === 'failed') {
            throw new common_1.HttpException('无法取消已完成或失败的任务', common_1.HttpStatus.BAD_REQUEST);
        }
        job.status = 'cancelled';
        return await this.jobRepository.save(job);
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_entity_1.Job)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], JobsService);
//# sourceMappingURL=jobs.service.js.map