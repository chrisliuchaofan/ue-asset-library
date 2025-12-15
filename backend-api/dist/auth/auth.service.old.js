"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt = require("jsonwebtoken");
let AuthService = class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
    }
    getWhitelistUsers() {
        const usersEnv = process.env.USER_WHITELIST || '';
        if (!usersEnv)
            return [];
        return usersEnv.split(',').map((user) => {
            const [email, password] = user.split(':');
            return { email: email.trim(), password: password.trim() };
        });
    }
    async login(email, password) {
        const whitelist = this.getWhitelistUsers();
        let user = whitelist.find((u) => u.email === email && u.password === password);
        if (!user) {
            const emailUsername = email.split('@')[0];
            user = whitelist.find((u) => {
                const whitelistEmail = u.email.trim();
                const whitelistUsername = whitelistEmail.split('@')[0];
                return (whitelistUsername === emailUsername || whitelistEmail === emailUsername) && u.password === password;
            });
        }
        if (user) {
            const token = jwt.sign({ userId: email, email }, this.jwtSecret, { expiresIn: '30d' });
            return {
                success: true,
                userId: email,
                email,
                name: email.split('@')[0],
                token,
            };
        }
        console.warn('[AuthService] 登录失败:', {
            email,
            whitelistEmails: whitelist.map(u => u.email),
            whitelistCount: whitelist.length,
        });
        throw new common_1.UnauthorizedException('邮箱或密码错误');
    }
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return {
                valid: true,
                userId: decoded.userId,
                email: decoded.email,
            };
        }
        catch (error) {
            return {
                valid: false,
            };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.old.js.map