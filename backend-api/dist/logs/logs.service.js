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
exports.LogsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const log_entry_entity_1 = require("../database/entities/log-entry.entity");
let LogsService = class LogsService {
    constructor(logRepository) {
        this.logRepository = logRepository;
    }
    async create(userId, logData) {
        const logEntry = this.logRepository.create({
            userId,
            action: logData.action,
            logType: logData.logType || 'business',
            level: logData.level || (logData.logType === 'system' ? 'info' : null),
            details: logData.details || null,
            success: logData.success,
            timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
        });
        const saved = await this.logRepository.save(logEntry);
        console.log('[Log]', JSON.stringify({
            logId: saved.id,
            userId: saved.userId,
            action: saved.action,
            logType: saved.logType,
            level: saved.level,
            success: saved.success,
            timestamp: saved.timestamp,
        }, null, 2));
        return { logId: saved.id };
    }
    async getUserLogs(userId, limit = 50) {
        return this.logRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
    async getAllLogs(limit = 100) {
        return this.logRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.LogsService = LogsService;
exports.LogsService = LogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(log_entry_entity_1.LogEntry)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LogsService);
//# sourceMappingURL=logs.service.js.map