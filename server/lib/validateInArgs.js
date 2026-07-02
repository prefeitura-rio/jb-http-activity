"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateInArgs = validateInArgs;
function validateInArgs(body) {
    if (typeof body !== 'object' || body === null) {
        return { valid: true, config: {} };
    }
    const inArgs = body.inArguments;
    if (!Array.isArray(inArgs)) {
        return { valid: true, config: {} };
    }
    const config = inArgs.reduce((acc, arg) => {
        if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
            return { ...acc, ...arg };
        }
        return acc;
    }, {});
    if (!config.url || typeof config.url !== 'string') {
        return { valid: false, error: 'URL nao configurada' };
    }
    if (!config.method || typeof config.method !== 'string') {
        return { valid: false, error: 'Metodo HTTP nao configurado' };
    }
    return { valid: true, config };
}
