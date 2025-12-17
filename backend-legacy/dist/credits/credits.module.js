"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const credits_controller_1 = require("./credits.controller");
const credits_service_1 = require("./credits.service");
const redeem_codes_service_1 = require("./redeem-codes.service");
const redeem_codes_controller_1 = require("./redeem-codes.controller");
const user_entity_1 = require("../database/entities/user.entity");
const credit_transaction_entity_1 = require("../database/entities/credit-transaction.entity");
const redeem_code_entity_1 = require("../database/entities/redeem-code.entity");
const auth_module_1 = require("../auth/auth.module");
let CreditsModule = class CreditsModule {
};
exports.CreditsModule = CreditsModule;
exports.CreditsModule = CreditsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, credit_transaction_entity_1.CreditTransaction, redeem_code_entity_1.RedeemCode]),
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
        ],
        controllers: [credits_controller_1.CreditsController, redeem_codes_controller_1.RedeemCodesController],
        providers: [credits_service_1.CreditsService, redeem_codes_service_1.RedeemCodesService],
        exports: [credits_service_1.CreditsService, redeem_codes_service_1.RedeemCodesService],
    })
], CreditsModule);
//# sourceMappingURL=credits.module.js.map