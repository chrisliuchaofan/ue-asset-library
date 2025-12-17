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
exports.RedeemCodesController = void 0;
const common_1 = require("@nestjs/common");
const redeem_codes_service_1 = require("./redeem-codes.service");
const auth_guard_1 = require("./auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let RedeemCodesController = class RedeemCodesController {
    constructor(redeemCodesService) {
        this.redeemCodesService = redeemCodesService;
    }
    async validateCode(code) {
        try {
            const redeemCode = await this.redeemCodesService.validateCode(code);
            return {
                valid: true,
                amount: redeemCode.amount,
                expiresAt: redeemCode.expiresAt,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('验证兑换码失败', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async redeemCode(user, code) {
        try {
            return await this.redeemCodesService.redeemCode(code, user.userId);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('使用兑换码失败', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateCodes(user, body) {
        const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
        const codes = await this.redeemCodesService.generateCodes(body.amount, body.count || 1, expiresAt, body.note);
        return {
            codes: codes.map((code) => ({
                code: code.code,
                amount: code.amount,
                expiresAt: code.expiresAt,
                createdAt: code.createdAt,
            })),
            count: codes.length,
        };
    }
    async getCodes(pageStr, pageSizeStr, usedStr, disabledStr) {
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
        const used = usedStr === 'true' ? true : usedStr === 'false' ? false : undefined;
        const disabled = disabledStr === 'true' ? true : disabledStr === 'false' ? false : undefined;
        return await this.redeemCodesService.getCodes({
            page,
            pageSize,
            used,
            disabled,
        });
    }
    async disableCode(user, code) {
        await this.redeemCodesService.disableCode(code, user.userId);
        return { success: true, message: '兑换码已禁用' };
    }
    async getStatistics() {
        return await this.redeemCodesService.getStatistics();
    }
};
exports.RedeemCodesController = RedeemCodesController;
__decorate([
    (0, common_1.Get)(':code/validate'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "validateCode", null);
__decorate([
    (0, common_1.Post)(':code/redeem'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "redeemCode", null);
__decorate([
    (0, common_1.Post)('admin/generate'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "generateCodes", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('used')),
    __param(3, (0, common_1.Query)('disabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "getCodes", null);
__decorate([
    (0, common_1.Post)('admin/:code/disable'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "disableCode", null);
__decorate([
    (0, common_1.Get)('admin/statistics'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RedeemCodesController.prototype, "getStatistics", null);
exports.RedeemCodesController = RedeemCodesController = __decorate([
    (0, common_1.Controller)('credits/redeem-codes'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [redeem_codes_service_1.RedeemCodesService])
], RedeemCodesController);
//# sourceMappingURL=redeem-codes.controller.js.map