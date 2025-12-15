import { AuthService } from './auth.service';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private authService;
    private creditsService;
    constructor(authService: AuthService, creditsService: CreditsService);
    login(body: {
        email: string;
        password: string;
        isAdmin?: boolean;
    }): Promise<{
        success: boolean;
        userId: string;
        email: string;
        name: string;
        token: string;
        isAdmin: boolean;
    }>;
    verify(body: {
        token: string;
    }): Promise<{
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
    getConfig(): {
        hasUserWhitelist: boolean;
        userWhitelistCount: number;
        userWhitelistEmails: string[];
        hasJwtSecret: boolean;
        hasNextAuthSecret: boolean;
        modelEnabled: boolean;
        billingEnabled: boolean;
        nodeEnv: string;
    };
}
export declare class MeController {
    private creditsService;
    private usersService;
    constructor(creditsService: CreditsService, usersService: UsersService);
    getMe(user: {
        userId: string;
        email: string;
    }): Promise<{
        userId: string;
        email: string;
        balance: number;
        billingMode: "DRY_RUN" | "REAL";
        modelMode: "DRY_RUN" | "REAL";
    }>;
}
