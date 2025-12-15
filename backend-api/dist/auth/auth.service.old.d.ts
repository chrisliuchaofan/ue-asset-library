export declare class AuthService {
    private jwtSecret;
    private getWhitelistUsers;
    login(email: string, password: string): Promise<{
        success: boolean;
        userId: string;
        email: string;
        name: string;
        token: string;
    }>;
    verifyToken(token: string): Promise<{
        valid: boolean;
        userId: any;
        email: any;
    } | {
        valid: boolean;
        userId?: undefined;
        email?: undefined;
    }>;
}
