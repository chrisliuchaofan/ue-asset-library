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
exports.MeController = exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const auth_guard_1 = require("../credits/auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const credits_service_1 = require("../credits/credits.service");
const users_service_1 = require("../users/users.service");
let AuthController = class AuthController {
    constructor(authService, creditsService) {
        this.authService = authService;
        this.creditsService = creditsService;
    }
    async login(body) {
        return this.authService.login(body.email, body.password, body.isAdmin || false);
    }
    async verify(body) {
        return this.authService.verifyToken(body.token);
    }
    getConfig() {
        const whitelist = process.env.USER_WHITELIST || '';
        return {
            hasUserWhitelist: !!whitelist,
            userWhitelistCount: whitelist ? whitelist.split(',').length : 0,
            userWhitelistEmails: whitelist
                ? whitelist.split(',').map(u => u.split(':')[0].trim())
                : [],
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            modelEnabled: process.env.MODEL_ENABLED !== 'false',
            billingEnabled: process.env.BILLING_ENABLED !== 'false',
            nodeEnv: process.env.NODE_ENV || 'development',
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verify", null);
__decorate([
    (0, common_1.Get)('debug/config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getConfig", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        credits_service_1.CreditsService])
], AuthController);
let MeController = class MeController {
    constructor(creditsService, usersService) {
        this.creditsService = creditsService;
        this.usersService = usersService;
    }
    async getMe(user) {
        const balanceResult = await this.creditsService.getBalance(user.userId);
        const dbUser = await this.usersService.findById(user.userId);
        const billingMode = dbUser?.billingMode || 'DRY_RUN';
        const modelMode = dbUser?.modelMode || 'DRY_RUN';
        return {
            userId: user.userId,
            email: user.email,
            balance: balanceResult.balance,
            billingMode,
            modelMode,
        };
    }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeController.prototype, "getMe", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)(''),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [credits_service_1.CreditsService,
        users_service_1.UsersService])
], MeController);
//# sourceMappingURL=auth.controller.js.map