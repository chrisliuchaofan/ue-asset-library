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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt = require("jsonwebtoken");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService) {
        this.usersService = usersService;
        this.jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';
    }
    getAdminWhitelistUsers() {
        const usersEnv = process.env.ADMIN_WHITELIST || process.env.USER_WHITELIST || '';
        if (!usersEnv)
            return [];
        return usersEnv.split(',').map((user) => {
            const [email, password] = user.split(':');
            return { email: email.trim(), password: password.trim() };
        });
    }
    async login(email, password, isAdmin = false) {
        if (isAdmin) {
            const adminWhitelist = this.getAdminWhitelistUsers();
            const adminUser = adminWhitelist.find((u) => {
                const whitelistEmail = u.email.trim();
                const emailUsername = email.split('@')[0];
                const whitelistUsername = whitelistEmail.includes('@')
                    ? whitelistEmail.split('@')[0]
                    : whitelistEmail;
                return (whitelistEmail === email || whitelistUsername === emailUsername) && u.password === password;
            });
            if (adminUser) {
                const token = jwt.sign({ userId: email, email, isAdmin: true }, this.jwtSecret, { expiresIn: '30d' });
                return {
                    success: true,
                    userId: email,
                    email,
                    name: email.split('@')[0],
                    token,
                    isAdmin: true,
                };
            }
        }
        try {
            const result = await this.usersService.login(email, password);
            return {
                success: true,
                userId: result.user.id,
                email: result.user.email,
                name: result.user.name,
                token: result.token,
                isAdmin: false,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('邮箱或密码错误');
        }
    }
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return {
                valid: true,
                userId: decoded.userId,
                email: decoded.email,
                isAdmin: decoded.isAdmin || false,
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
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], AuthService);
//# sourceMappingURL=auth.service.js.map