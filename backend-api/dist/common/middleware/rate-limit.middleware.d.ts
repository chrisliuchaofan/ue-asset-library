import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
export declare class RateLimitMiddleware implements NestMiddleware {
    private userLimits;
    use(req: Request, res: Response, next: NextFunction): void;
    recordConsumption(userId: string, amount: number): void;
    getDailyCost(userId: string): number;
}
