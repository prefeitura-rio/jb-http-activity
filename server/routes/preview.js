"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = previewRoute;
const httpClient_1 = require("../lib/httpClient");
const authHandler_1 = require("../lib/authHandler");
const responseMapper_1 = require("../lib/responseMapper");
const types_1 = require("../types");
async function previewRoute(req, res) {
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
            _rawBody: httpResponse.data,
            _duration: durationMs,
            _timestamp: new Date().toISOString(),
            _url: config.url,
            _method: config.method,
            _statusClass: statusClass,
            _attempts: httpResponse.attempts,
            httpStatusCode: statusCode,
            httpStatusClass: statusClass,
            httpSuccess: isSuccess,
            ...mapped
        };
        console.log('[PREVIEW]', JSON.stringify({
            method: config.method,
            url: config.url,
            httpStatus: statusCode,
            durationMs,
            statusClass,
            success: isSuccess
        }));
        res.status(200).json(outArgs);
    }
    catch (err) {
        const outArgs = {
            _duration: 0,
            _timestamp: new Date().toISOString(),
            _url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
            _attempts: err instanceof Error && '_attempts' in err ? err._attempts : 1,
            httpStatusCode: 0,
            httpStatusClass: '0xx',
            httpSuccess: false
        };
        console.log('[PREVIEW]', JSON.stringify({
            method: config ? (typeof config.method === 'string' ? config.method : 'unknown') : 'unknown',
            url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
            httpStatus: 0,
            error: err instanceof Error ? err.message : 'Erro desconhecido'
        }));
        const errorResponse = {
            error: err instanceof Error ? err.message : 'Erro interno do servidor',
            ...outArgs
        };
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
