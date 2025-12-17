import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AuthGuard implements CanActivate {
    private jwtSecret;
    canActivate(context: ExecutionContext): boolean;
}
