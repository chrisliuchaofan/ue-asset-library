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
        try {
            const result = await this.usersService.login(email, password);
            const userIsAdmin = isAdmin || this.isAdmin(result.user.email);
            return {
                success: true,
                userId: result.user.id,
                email: result.user.email,
                name: result.user.name,
                token: result.token,
                isAdmin: userIsAdmin,
            };
        }
        catch (error) {
            const isDevelopment = process.env.NODE_ENV === 'development';
            if (!isDevelopment) {
                throw new common_1.UnauthorizedException('邮箱或密码错误');
            }
            console.warn(`[AuthService] 数据库验证失败，尝试白名单验证（仅开发环境）: ${email}`);
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
                console.warn(`[AuthService] ⚠️ 使用白名单登录（仅开发环境）: ${email}`);
                try {
                    const existingUser = await this.usersService.findByEmail(email);
                    if (!existingUser) {
                        console.log(`[AuthService] 白名单用户登录: ${email}，但数据库中不存在，CreditsService 会在初始化时创建`);
                    }
                }
                catch (error) {
                    console.warn(`[AuthService] 查询用户失败: ${email}`, error);
                }
                const token = jwt.sign({ userId: email, email, isAdmin: isAdmin || true }, this.jwtSecret, { expiresIn: '30d' });
                return {
                    success: true,
                    userId: email,
                    email,
                    name: email.split('@')[0],
                    token,
                    isAdmin: isAdmin || true,
                };
            }
            throw new common_1.UnauthorizedException('邮箱或密码错误');
        }
    }
    isAdmin(email) {
        const adminUsersEnv = process.env.ADMIN_USERS || process.env.ADMIN_WHITELIST || process.env.USER_WHITELIST || '';
        if (!adminUsersEnv)
            return false;
        const adminEmails = adminUsersEnv.split(',').map(user => {
            const [emailOrUsername] = user.split(':');
            return emailOrUsername.trim();
        });
        return adminEmails.some(adminEmail => {
            const emailUsername = email.split('@')[0];
            const adminEmailUsername = adminEmail.includes('@')
                ? adminEmail.split('@')[0]
                : adminEmail;
            return adminEmail === email || adminEmailUsername === emailUsername;
        });
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