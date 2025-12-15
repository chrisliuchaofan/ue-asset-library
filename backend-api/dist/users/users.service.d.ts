import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
export declare class UsersService {
    private userRepository;
    private jwtSecret;
    constructor(userRepository: Repository<User>);
    register(email: string, password: string, name?: string): Promise<{
        user: Omit<User, 'passwordHash'>;
        token: string;
    }>;
    login(email: string, password: string): Promise<{
        user: Omit<User, 'passwordHash'>;
        token: string;
    }>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    updateCredits(userId: string, credits: number): Promise<void>;
    getCredits(userId: string): Promise<number>;
}
