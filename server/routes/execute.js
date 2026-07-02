"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = executeRoute;
const httpClient_1 = require("../lib/httpClient");
const authHandler_1 = require("../lib/authHandler");
const responseMapper_1 = require("../lib/responseMapper");
const structuredLogger_1 = __importDefault(require("../lib/structuredLogger"));
const bigQueryLogger_1 = require("../lib/bigQueryLogger");
const types_1 = require("../types");
async function executeRoute(req, res) {
    let config = {};
    try {
        const body = req.body;
        const inArgs = body && typeof body === 'object' && !Array.isArray(body)
            ? body.inArguments
            : undefined;
        if (!(0, types_1.isInArgArray)(inArgs)) {
            res.status(400).json({ error: 'inArguments ausente ou invalido' });
            return;
        }
        config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {});
        const rawHeaders = safeParse(config.headers);
        const rawQueryParams = safeParse(config.queryParams);
        const rawAuth = safeParse(config.auth);
        const rawResponseMapping = safeParse(config.responseMapping);
        const headers = (0, types_1.isHeaderArray)(rawHeaders) ? rawHeaders : [];
        const queryParams = (0, types_1.isQueryParamArray)(rawQueryParams) ? rawQueryParams : [];
        const auth = (0, types_1.isAuthConfig)(rawAuth) ? rawAuth : { type: 'none' };
        const responseMapping = (0, types_1.isResponseMappingArray)(rawResponseMapping) ? rawResponseMapping : [];
        const headersMap = {};
        for (const h of headers) {
            if (h.key)
                headersMap[h.key] = h.value || '';
        }
        const paramsMap = {};
        for (const p of queryParams) {
            if (p.key)
                paramsMap[p.key] = p.value || '';
        }
        const authHeaders = await (0, authHandler_1.resolveAuth)(auth);
        Object.assign(headersMap, authHeaders);
        let bodyData = null;
        const contentType = typeof config.contentType === 'string' ? config.contentType : 'application/json';
        const method = typeof config.method === 'string' ? config.method : 'GET';
        const configBody = config.body;
        if (configBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            const bodyStr = String(configBody);
            if (contentType === 'application/json') {
                try {
                    bodyData = JSON.parse(bodyStr);
                }
                catch {
                    bodyData = bodyStr;
                }
            }
            else if (contentType === 'application/x-www-form-urlencoded') {
                bodyData = new URLSearchParams(bodyStr).toString();
            }
            else if (contentType === 'multipart/form-data') {
                const fd = new FormData();
                for (const pair of bodyStr.split('&')) {
                    const idx = pair.indexOf('=');
                    if (idx > 0)
                        fd.append(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
                }
                bodyData = fd;
            }
            else {
                bodyData = bodyStr;
            }
        }
        if (!headersMap['Content-Type'] && !headersMap['content-type']) {
            headersMap['Content-Type'] = contentType;
        }
        const startTime = Date.now();
        const httpResponse = await (0, httpClient_1.request)({
            method,
            url: typeof config.url === 'string' ? config.url : '',
            headers: headersMap,
            queryParams: paramsMap,
            body: bodyData,
            timeout: typeof config.timeout === 'number' ? config.timeout : 30000,
            retryCount: typeof config.retryCount === 'number' ? config.retryCount : 0,
            retryDelay: typeof config.retryDelay === 'number' ? config.retryDelay : 1000
        });
        const durationMs = Date.now() - startTime;
        const statusCode = httpResponse.status;
        const statusClass = `${Math.floor(statusCode / 100)}xx`;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        const mapped = (0, responseMapper_1.extract)(httpResponse.data, responseMapping);
        const outArgs = {
            httpStatusCode: statusCode,
            httpStatusClass: statusClass,
            httpSuccess: isSuccess,
            ...mapped
        };
        if (config._preview === true) {
            outArgs._rawBody = httpResponse.data;
            outArgs._duration = durationMs;
            outArgs._timestamp = new Date().toISOString();
            outArgs._url = config.url;
            outArgs._method = config.method;
            outArgs._statusClass = statusClass;
            outArgs._attempts = httpResponse.attempts;
        }
        const logEntryRaw = {
            journeyId: body && typeof body === 'object' ? body.journeyId : undefined,
            contactKey: body && typeof body === 'object' ? body.contactKey : undefined,
            activityId: body && typeof body === 'object' ? body.activityId : undefined,
            method: config.method,
            url: config.url,
            httpStatus: statusCode,
            durationMs,
            statusClass,
            success: isSuccess,
            treatErrorsAsOutput: config.treatErrorsAsOutput,
            outArguments: outArgs,
            errorSummary: null,
            message: isSuccess
                ? `HTTP ${statusCode} (${durationMs}ms)`
                : `HTTP ${statusCode} - ${statusClass}`
        };
        const logEntry = logEntryRaw;
        structuredLogger_1.default.info(logEntry);
        (0, bigQueryLogger_1.log)(logEntry);
        const treatErrors = config.treatErrorsAsOutput === true;
        if (!treatErrors && !isSuccess) {
            res.status(500).json({
                error: `HTTP ${statusCode} da API externa`,
                httpStatusCode: statusCode,
                httpStatusClass: statusClass,
                httpSuccess: false,
                ...mapped
            });
            return;
        }
        res.status(200).json(outArgs);
    }
    catch (err) {
        const outArgs = {
            httpStatusCode: 0,
            httpStatusClass: '0xx',
            httpSuccess: false
        };
        const logEntryRaw = {
            journeyId: req.body && typeof req.body === 'object' ? req.body.journeyId : null,
            contactKey: req.body && typeof req.body === 'object' ? req.body.contactKey : null,
            activityId: req.body && typeof req.body === 'object' ? req.body.activityId : null,
            method: 'unknown',
            url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
            httpStatus: 0,
            durationMs: 0,
            statusClass: '0xx',
            success: false,
            outArguments: outArgs,
            errorSummary: err instanceof Error ? err.message : 'Erro interno',
            message: `Erro: ${err instanceof Error ? err.message : 'Erro interno do servidor'}`
        };
        const logEntry = logEntryRaw;
        structuredLogger_1.default.error(logEntry);
        (0, bigQueryLogger_1.log)(logEntry);
        const errorResponse = {
            error: err instanceof Error ? err.message : 'Erro interno do servidor',
            ...outArgs
        };
        if (config._preview === true && err instanceof Error && '_attempts' in err) {
            errorResponse._attempts = err._attempts;
        }
        res.status(500).json(errorResponse);
    }
}
function safeParse(str) {
    if (str == null)
        return undefined;
    if (typeof str === 'object')
        return str;
    if (typeof str === 'string') {
        try {
            return JSON.parse(str);
        }
        catch {
            return str;
        }
    }
    return str;
}
// (not needed - using export default)
