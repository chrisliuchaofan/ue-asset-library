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
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("./entities/user.entity");
const credit_transaction_entity_1 = require("./entities/credit-transaction.entity");
const log_entry_entity_1 = require("./entities/log-entry.entity");
const job_entity_1 = require("./entities/job.entity");
const job_output_entity_1 = require("./entities/job-output.entity");
const project_entity_1 = require("./entities/project.entity");
const redeem_code_entity_1 = require("./entities/redeem-code.entity");
let DatabaseModule = class DatabaseModule {
    constructor() {
        if (!process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
            console.error('[DatabaseModule] 错误：数据库配置不完整！');
            console.error('[DatabaseModule] 请检查 .env 文件中的 DB_USERNAME 和 DB_PASSWORD');
            console.error('[DatabaseModule] 当前配置：', {
                DB_HOST: process.env.DB_HOST,
                DB_PORT: process.env.DB_PORT,
                DB_NAME: process.env.DB_NAME,
                DB_USERNAME: process.env.DB_USERNAME ? '已设置' : '未设置',
                DB_PASSWORD: process.env.DB_PASSWORD ? '已设置' : '未设置',
            });
        }
    }
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432', 10),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'ue_assets',
                entities: [user_entity_1.User, credit_transaction_entity_1.CreditTransaction, log_entry_entity_1.LogEntry, job_entity_1.Job, job_output_entity_1.JobOutput, project_entity_1.Project, redeem_code_entity_1.RedeemCode],
                synchronize: process.env.NODE_ENV !== 'production',
                logging: process.env.NODE_ENV !== 'production',
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, credit_transaction_entity_1.CreditTransaction, log_entry_entity_1.LogEntry, job_entity_1.Job, job_output_entity_1.JobOutput, project_entity_1.Project, redeem_code_entity_1.RedeemCode]),
        ],
        exports: [typeorm_1.TypeOrmModule],
    }),
    __metadata("design:paramtypes", [])
], DatabaseModule);
//# sourceMappingURL=database.module.js.map