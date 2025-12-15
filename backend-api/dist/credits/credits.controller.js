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
exports.CreditsController = void 0;
const common_1 = require("@nestjs/common");
const credits_service_1 = require("./credits.service");
const auth_guard_1 = require("./auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let CreditsController = class CreditsController {
    constructor(creditsService) {
        this.creditsService = creditsService;
    }
    async getBalance(user) {
        return this.creditsService.getBalance(user.userId);
    }
    async consume(user, body) {
        return this.creditsService.consume(user.userId, body.amount, body.action, body.refId);
    }
    async recharge(user, body) {
        if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RECHARGE !== 'true') {
            throw new Error('充值功能在生产环境已禁用');
        }
        return this.creditsService.recharge(user.userId, body.amount);
    }
    async getTransactions(user, limitStr, offsetStr, targetUserId) {
        if (targetUserId && targetUserId !== user.userId) {
            const adminUsers = process.env.ADMIN_USERS || process.env.USER_WHITELIST || '';
            const adminEmails = adminUsers
                .split(',')
                .map((u) => u.split(':')[0].trim())
                .filter((email) => email.length > 0);
            if (!adminEmails.includes(user.email)) {
                throw new Error('权限不足，需要管理员权限才能查看其他用户的交易记录');
            }
        }
        const targetUserId_final = targetUserId || user.userId;
        const limit = limitStr ? parseInt(limitStr, 10) : 50;
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
        return this.creditsService.getTransactions(targetUserId_final, limit, offset);
    }
    async adminRecharge(user, body) {
        return this.creditsService.adminRecharge(body.targetUserId, body.amount, user.userId);
    }
};
exports.CreditsController = CreditsController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('consume'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "consume", null);
__decorate([
    (0, common_1.Post)('recharge'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "recharge", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __param(3, (0, common_1.Query)('targetUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('admin/recharge'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CreditsController.prototype, "adminRecharge", null);
exports.CreditsController = CreditsController = __decorate([
    (0, common_1.Controller)('credits'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [credits_service_1.CreditsService])
], CreditsController);
//# sourceMappingURL=credits.controller.js.map