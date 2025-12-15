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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const model_adapter_service_1 = require("./model-adapter.service");
const auth_guard_1 = require("../credits/auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const model_presets_1 = require("./model-presets");
const storage_service_1 = require("../storage/storage.service");
const jobs_service_1 = require("../jobs/jobs.service");
let AiController = class AiController {
    constructor(modelAdapterService, storageService, jobsService) {
        this.modelAdapterService = modelAdapterService;
        this.storageService = storageService;
        this.jobsService = jobsService;
    }
    async getPresets() {
        return {
            presets: (0, model_presets_1.getAllPresets)(),
        };
    }
    async generateText(user, body) {
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            if (!body.presetId) {
                throw new common_1.HttpException('生产环境必须使用 presetId，禁止自由指定参数', common_1.HttpStatus.BAD_REQUEST);
            }
            const validation = (0, model_presets_1.validatePresetParams)(body.presetId, {
                provider: body.provider,
                model: body.model,
                maxTokens: body.maxTokens,
                temperature: body.temperature,
            });
            if (!validation.valid) {
                throw new common_1.HttpException(validation.error || '参数验证失败', common_1.HttpStatus.BAD_REQUEST);
            }
            const preset = validation.preset;
            const options = {
                provider: preset.provider,
                model: preset.model,
                systemPrompt: body.systemPrompt || preset.systemPrompt,
                maxTokens: preset.maxTokens,
                temperature: preset.temperature,
            };
            const result = await this.modelAdapterService.generateContent(body.prompt, options);
            return {
                text: result.text,
                raw: result.raw,
                preset: {
                    id: preset.id,
                    name: preset.name,
                },
            };
        }
        else {
            const preset = body.presetId ? (0, model_presets_1.getPreset)(body.presetId) : null;
            const options = {
                provider: preset?.provider || body.provider,
                model: preset?.model || body.model,
                systemPrompt: body.systemPrompt || preset?.systemPrompt,
                maxTokens: preset?.maxTokens || body.maxTokens,
                temperature: preset?.temperature ?? body.temperature,
            };
            const result = await this.modelAdapterService.generateContent(body.prompt, options);
            return {
                text: result.text,
                raw: result.raw,
                preset: preset ? { id: preset.id, name: preset.name } : null,
            };
        }
    }
    async generateImage(user, body) {
        if (body.imageUrl) {
            try {
                const job = await this.jobsService.create({
                    userId: user.userId,
                    type: 'image_generation',
                    input: {
                        prompt: body.prompt,
                        imageUrl: body.imageUrl,
                    },
                });
                const jobOutput = await this.storageService.uploadJobOutputFromSource(user.userId, job.id, 'image', body.imageUrl, {
                    format: 'jpg',
                });
                await this.jobsService.complete(job.id, {
                    output: {
                        imageUrl: jobOutput.ossUrl,
                    },
                    creditCost: 0,
                    transactionId: '',
                });
                return {
                    imageUrl: jobOutput.ossUrl,
                };
            }
            catch (error) {
                throw new common_1.HttpException(`上传图片到 OSS 失败: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        throw new common_1.HttpException('暂不支持后端直接生成图片，请提供 imageUrl', common_1.HttpStatus.NOT_IMPLEMENTED);
    }
    async generateVideo(user, body) {
        if (body.videoUrl) {
            try {
                const job = await this.jobsService.create({
                    userId: user.userId,
                    type: 'video_generation',
                    input: {
                        prompt: body.prompt,
                        imageUrl: body.imageUrl,
                        videoUrl: body.videoUrl,
                    },
                });
                const jobOutput = await this.storageService.uploadJobOutputFromSource(user.userId, job.id, 'video', body.videoUrl, {
                    format: 'mp4',
                    duration: body.duration,
                });
                await this.jobsService.complete(job.id, {
                    output: {
                        videoUrl: jobOutput.ossUrl,
                    },
                    creditCost: 0,
                    transactionId: '',
                });
                return {
                    videoUrl: jobOutput.ossUrl,
                };
            }
            catch (error) {
                throw new common_1.HttpException(`上传视频到 OSS 失败: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        throw new common_1.HttpException('暂不支持后端直接生成视频，请提供 videoUrl', common_1.HttpStatus.NOT_IMPLEMENTED);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('presets'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getPresets", null);
__decorate([
    (0, common_1.Post)('generate-text'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateText", null);
__decorate([
    (0, common_1.Post)('generate-image'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateImage", null);
__decorate([
    (0, common_1.Post)('generate-video'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "generateVideo", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [model_adapter_service_1.ModelAdapterService,
        storage_service_1.StorageService,
        jobs_service_1.JobsService])
], AiController);
//# sourceMappingURL=ai.controller.js.map