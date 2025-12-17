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
var StorageCleanupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageCleanupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const fs_1 = require("fs");
const path_1 = require("path");
let StorageCleanupService = StorageCleanupService_1 = class StorageCleanupService {
    constructor() {
        this.logger = new common_1.Logger(StorageCleanupService_1.name);
        this.tempDir = '/tmp/dream-factory';
    }
    async cleanupOldTempFiles() {
        this.logger.log('开始清理过期临时文件...');
        try {
            const ageHours = 24;
            const cutoff = Date.now() - ageHours * 60 * 60 * 1000;
            const files = await fs_1.promises.readdir(this.tempDir);
            let cleanedCount = 0;
            for (const file of files) {
                const filePath = (0, path_1.join)(this.tempDir, file);
                try {
                    const stats = await fs_1.promises.stat(filePath);
                    if (stats.isFile() && stats.mtimeMs < cutoff) {
                        await fs_1.promises.unlink(filePath);
                        cleanedCount++;
                        this.logger.log(`清理过期临时文件: ${file}`);
                    }
                }
                catch (error) {
                    this.logger.warn(`清理文件失败: ${file}`, error);
                }
            }
            this.logger.log(`清理完成: 共清理 ${cleanedCount} 个过期文件`);
        }
        catch (error) {
            this.logger.error('清理过期临时文件失败:', error);
        }
    }
    async cleanupNow(ageHours = 24) {
        this.logger.log(`手动触发清理，清理 ${ageHours} 小时前的文件...`);
        try {
            const cutoff = Date.now() - ageHours * 60 * 60 * 1000;
            const files = await fs_1.promises.readdir(this.tempDir);
            let cleanedCount = 0;
            for (const file of files) {
                const filePath = (0, path_1.join)(this.tempDir, file);
                try {
                    const stats = await fs_1.promises.stat(filePath);
                    if (stats.isFile() && stats.mtimeMs < cutoff) {
                        await fs_1.promises.unlink(filePath);
                        cleanedCount++;
                    }
                }
                catch (error) {
                    this.logger.warn(`清理文件失败: ${file}`, error);
                }
            }
            this.logger.log(`手动清理完成: 共清理 ${cleanedCount} 个过期文件`);
            return cleanedCount;
        }
        catch (error) {
            this.logger.error('手动清理失败:', error);
            throw error;
        }
    }
};
exports.StorageCleanupService = StorageCleanupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StorageCleanupService.prototype, "cleanupOldTempFiles", null);
exports.StorageCleanupService = StorageCleanupService = StorageCleanupService_1 = __decorate([
    (0, common_1.Injectable)()
], StorageCleanupService);
//# sourceMappingURL=storage-cleanup.service.js.map