import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    register(body: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        user: Omit<import("../database/entities/user.entity").User, "passwordHash">;
        token: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        user: Omit<import("../database/entities/user.entity").User, "passwordHash">;
        token: string;
    }>;
    getMe(user: {
        userId: string;
        email: string;
    }): Promise<{
        id: string;
        email: string;
        name: string;
        credits: number;
        billingMode: "DRY_RUN" | "REAL";
        modelMode: "DRY_RUN" | "REAL";
        createdAt: Date;
        updatedAt: Date;
    }>;
    getAllUsers(user: {
        userId: string;
        email: string;
    }): Promise<{
        users: Omit<import("../database/entities/user.entity").User, "passwordHash">[];
    }>;
    updateUserMode(currentUser: {
        userId: string;
        email: string;
    }, body: {
        targetUserId: string;
        billingMode?: 'DRY_RUN' | 'REAL';
        modelMode?: 'DRY_RUN' | 'REAL';
    }): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            credits: number;
            billingMode: "DRY_RUN" | "REAL";
            modelMode: "DRY_RUN" | "REAL";
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
}
