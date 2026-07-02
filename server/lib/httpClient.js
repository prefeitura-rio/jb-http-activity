"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRetry = shouldRetry;
exports.request = request;
exports.sleep = sleep;
const axios_1 = __importDefault(require("axios"));
const blocklist_1 = require("./blocklist");
function shouldRetry(attempt, retryCount, response) {
    if (attempt >= retryCount)
        return false;
    if (!response)
        return true;
    return response.status >= 500;
}
async function request(config) {
    const { method, url, headers, queryParams, body } = config;
    const retryCount = Math.min(config.retryCount || 0, 3);
    const retryDelay = Math.min(config.retryDelay || 1000, 5000);
    if (url) {
        const validation = await (0, blocklist_1.validateUrl)(url);
        if (!validation.valid) {
            throw new Error(`URL bloqueada: ${validation.error}`);
        }
    }
    const reqConfig = {
        method: method || 'GET',
        url: url || '',
        headers: (headers || {}),
        params: queryParams || {},
        timeout: Math.min(config.timeout || 30000, 40000),
        validateStatus: () => true
    };
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        reqConfig.data = body;
    }
    let lastResponse = null;
    let lastError = null;
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            const response = await (0, axios_1.default)(reqConfig);
            lastResponse = response;
            if (shouldRetry(attempt, retryCount, response)) {
                await sleep(retryDelay);
                continue;
            }
            if (response.status >= 400) {
                break;
            }
            return { status: response.status, data: response.data, attempts: attempt + 1 };
        }
        catch (err) {
            if (err instanceof Error) {
                lastError = err;
            }
            else {
                lastError = new Error(String(err));
            }
            if (shouldRetry(attempt, retryCount, null)) {
                await sleep(retryDelay);
                continue;
            }
            break;
        }
    }
    if (lastError) {
        ;
        lastError._attempts = retryCount + 1;
        throw lastError;
    }
    throw new Error('Nenhuma resposta recebida');
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
