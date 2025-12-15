"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const model_adapter_service_1 = require("./model-adapter.service");
const ai_controller_1 = require("./ai.controller");
const storage_module_1 = require("../storage/storage.module");
const jobs_module_1 = require("../jobs/jobs.module");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [storage_module_1.StorageModule, jobs_module_1.JobsModule],
        providers: [model_adapter_service_1.ModelAdapterService],
        controllers: [ai_controller_1.AiController],
        exports: [model_adapter_service_1.ModelAdapterService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map