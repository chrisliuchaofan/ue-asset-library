"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const health_module_1 = require("./health/health.module");
const auth_module_1 = require("./auth/auth.module");
const credits_module_1 = require("./credits/credits.module");
const logs_module_1 = require("./logs/logs.module");
const jobs_module_1 = require("./jobs/jobs.module");
const ai_module_1 = require("./ai/ai.module");
const database_module_1 = require("./database/database.module");
const users_module_1 = require("./users/users.module");
const storage_module_1 = require("./storage/storage.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            credits_module_1.CreditsModule,
            logs_module_1.LogsModule,
            jobs_module_1.JobsModule,
            ai_module_1.AiModule,
            storage_module_1.StorageModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map