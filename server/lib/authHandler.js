"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuth = resolveAuth;
const axios_1 = __importDefault(require("axios"));
const blocklist_1 = require("./blocklist");
const types_1 = require("../types");
async function resolveAuth(authConfig) {
    if (!(0, types_1.isAuthConfig)(authConfig))
        return {};
    if ((0, types_1.isNoneAuth)(authConfig)) {
        return {};
    }
    if ((0, types_1.isBearerAuth)(authConfig)) {
        if (!authConfig.token)
            return {};
        return { Authorization: `Bearer ${authConfig.token}` };
    }
    if ((0, types_1.isOAuth2Auth)(authConfig)) {
        const { tokenUrl, clientId, clientSecret, scope } = authConfig;
        if (!tokenUrl || !clientId || !clientSecret)
            return {};
        const validation = await (0, blocklist_1.validateUrl)(tokenUrl);
        if (!validation.valid) {
            const errorMsg = validation.error;
            throw new Error(`tokenUrl bloqueada: ${errorMsg}`);
        }
        const params = {
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret
        };
        if (scope) {
            params.scope = scope;
        }
        const response = await axios_1.default.post(tokenUrl, null, {
            params
        });
        return { Authorization: `Bearer ${response.data.access_token}` };
    }
    return {};
}
