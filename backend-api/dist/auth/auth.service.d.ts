import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtSecret;
    constructor(usersService: UsersService);
    private getAdminWhitelistUsers;
    login(email: string, password: string, isAdmin?: boolean): Promise<{
        success: boolean;
        userId: string;
        email: string;
        name: string;
        token: string;
        isAdmin: boolean;
    }>;
    verifyToken(token: string): Promise<{
        valid: boolean;
        userId: any;
        email: any;
        isAdmin: any;
    } | {
        valid: boolean;
        userId?: undefined;
        email?: undefined;
        isAdmin?: undefined;
    }>;
}
