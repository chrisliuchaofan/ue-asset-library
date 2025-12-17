export declare class RedeemCode {
    id: string;
    code: string;
    amount: number;
    used: boolean;
    usedBy: string | null;
    usedAt: Date | null;
    createdAt: Date;
    expiresAt: Date | null;
    disabled: boolean;
    disabledAt: Date | null;
    disabledBy: string | null;
    note: string | null;
}
