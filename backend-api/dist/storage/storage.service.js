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
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
const fs_2 = require("fs");
const ali_oss_1 = require("ali-oss");
const job_output_entity_1 = require("../database/entities/job-output.entity");
let StorageService = class StorageService {
    constructor(jobOutputRepository) {
        this.jobOutputRepository = jobOutputRepository;
        this.ossClient = null;
        this.tempDir = '/tmp/dream-factory';
        if (!(0, fs_2.existsSync)(this.tempDir)) {
            (0, fs_2.mkdirSync)(this.tempDir, { recursive: true });
        }
    }
    getOSSClient() {
        if (this.ossClient) {
            return this.ossClient;
        }
        const bucket = process.env.OSS_BUCKET;
        const region = process.env.OSS_REGION;
        const accessKeyId = process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY;
        const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || process.env.OSS_SECRET;
        if (!bucket || !region || !accessKeyId || !accessKeySecret) {
            throw new common_1.HttpException('OSS 配置不完整，请检查环境变量：OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY, OSS_SECRET', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        this.ossClient = new ali_oss_1.default({
            bucket,
            region,
            accessKeyId,
            accessKeySecret,
        });
        return this.ossClient;
    }
    generateOSSPath(userId, jobId, type, extension) {
        const timestamp = Date.now();
        return `users/${userId}/jobs/${jobId}/${type}-${timestamp}.${extension}`;
    }
    generateOSSUrl(ossPath) {
        const baseUrl = process.env.OSS_BASE_URL;
        if (baseUrl) {
            return `${baseUrl.replace(/\/+$/, '')}/${ossPath}`;
        }
        const bucket = process.env.OSS_BUCKET;
        const region = process.env.OSS_REGION.replace(/^oss-/, '');
        return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
    }
    async saveTempFile(buffer, jobId, extension) {
        const tempFilePath = (0, path_1.join)(this.tempDir, `${jobId}${extension}`);
        await fs_1.promises.writeFile(tempFilePath, buffer);
        return tempFilePath;
    }
    async uploadJobOutput(userId, jobId, type, buffer, meta) {
        const extension = meta?.format
            ? (meta.format.startsWith('.') ? meta.format : `.${meta.format}`)
            : (type === 'image' ? '.jpg' : '.mp4');
        const tempFilePath = await this.saveTempFile(buffer, jobId, extension);
        try {
            const ossPath = this.generateOSSPath(userId, jobId, type, extension.replace(/^\./, ''));
            const ossClient = this.getOSSClient();
            const contentType = type === 'image'
                ? (extension === '.png' ? 'image/png' : 'image/jpeg')
                : 'video/mp4';
            await ossClient.put(ossPath, buffer, {
                headers: {
                    'Content-Type': contentType,
                },
            });
            const ossUrl = this.generateOSSUrl(ossPath);
            const jobOutput = this.jobOutputRepository.create({
                jobId,
                userId,
                type,
                ossUrl,
                ossPath,
                size: buffer.length,
                meta: meta || null,
            });
            const savedOutput = await this.jobOutputRepository.save(jobOutput);
            try {
                await fs_1.promises.unlink(tempFilePath);
            }
            catch (error) {
                console.warn(`[StorageService] 删除临时文件失败: ${tempFilePath}`, error);
            }
            return savedOutput;
        }
        catch (error) {
            try {
                await fs_1.promises.unlink(tempFilePath);
            }
            catch {
            }
            throw error;
        }
    }
    async uploadJobOutputFromSource(userId, jobId, type, source, meta) {
        let buffer;
        if (Buffer.isBuffer(source)) {
            buffer = source;
        }
        else if (typeof source === 'string' && source.startsWith('http')) {
            const response = await fetch(source);
            if (!response.ok) {
                throw new common_1.HttpException(`下载文件失败: ${response.statusText}`, common_1.HttpStatus.BAD_REQUEST);
            }
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }
        else {
            throw new common_1.HttpException('无效的文件源', common_1.HttpStatus.BAD_REQUEST);
        }
        return this.uploadJobOutput(userId, jobId, type, buffer, meta);
    }
    async getJobOutputs(jobId) {
        return this.jobOutputRepository.find({
            where: { jobId },
            order: { createdAt: 'ASC' },
        });
    }
    async cleanupJobTempFiles(jobId) {
        try {
            const files = await fs_1.promises.readdir(this.tempDir);
            const jobFiles = files.filter(file => file.startsWith(jobId));
            for (const file of jobFiles) {
                const filePath = (0, path_1.join)(this.tempDir, file);
                try {
                    await fs_1.promises.unlink(filePath);
                    console.log(`[StorageService] 已清理临时文件: ${filePath}`);
                }
                catch (error) {
                    console.warn(`[StorageService] 清理临时文件失败: ${filePath}`, error);
                }
            }
        }
        catch (error) {
            console.warn(`[StorageService] 清理临时文件目录失败: ${this.tempDir}`, error);
        }
    }
    async cleanupOldTempFiles() {
        let cleanedCount = 0;
        try {
            const files = await fs_1.promises.readdir(this.tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000;
            for (const file of files) {
                const filePath = (0, path_1.join)(this.tempDir, file);
                try {
                    const stats = await fs_1.promises.stat(filePath);
                    const age = now - stats.mtimeMs;
                    if (age > maxAge) {
                        await fs_1.promises.unlink(filePath);
                        cleanedCount++;
                        console.log(`[StorageService] 已清理过期临时文件: ${filePath}`);
                    }
                }
                catch (error) {
                    console.warn(`[StorageService] 检查临时文件失败: ${filePath}`, error);
                }
            }
        }
        catch (error) {
            console.warn(`[StorageService] 清理过期临时文件失败: ${this.tempDir}`, error);
        }
        return cleanedCount;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(job_output_entity_1.JobOutput)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], StorageService);
//# sourceMappingURL=storage.service.js.map