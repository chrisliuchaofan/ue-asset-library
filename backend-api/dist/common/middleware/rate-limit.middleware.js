"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitMiddleware = void 0;
const common_1 = require("@nestjs/common");
let RateLimitMiddleware = class RateLimitMiddleware {
    constructor() {
        this.userLimits = new Map();
    }
    use(req, res, next) {
        const user = req.user;
        if (!user?.userId) {
            return next();
        }
        const userId = user.userId;
        const now = Date.now();
        const limit = this.userLimits.get(userId);
        if (!limit || now > limit.resetAt) {
            this.userLimits.set(userId, {
                count: 0,
                resetAt: now + 24 * 60 * 60 * 1000,
                dailyCost: 0,
            });
            return next();
        }
        const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10);
        if (limit.count >= RATE_LIMIT_PER_MINUTE) {
            throw new common_1.HttpException('请求过于频繁，请稍后再试', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const DAILY_COST_LIMIT = parseInt(process.env.DAILY_COST_LIMIT || '1000', 10);
        if (limit.dailyCost >= DAILY_COST_LIMIT) {
            throw new common_1.HttpException(`今日积分消费已达上限（${DAILY_COST_LIMIT}），请明天再试`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        limit.count++;
        this.userLimits.set(userId, limit);
        next();
    }
    recordConsumption(userId, amount) {
        const limit = this.userLimits.get(userId);
        if (limit) {
            limit.dailyCost += amount;
            this.userLimits.set(userId, limit);
        }
    }
    getDailyCost(userId) {
        const limit = this.userLimits.get(userId);
        return limit?.dailyCost || 0;
    }
};
exports.RateLimitMiddleware = RateLimitMiddleware;
exports.RateLimitMiddleware = RateLimitMiddleware = __decorate([
    (0, common_1.Injectable)()
], RateLimitMiddleware);
//# sourceMappingURL=rate-limit.middleware.js.map