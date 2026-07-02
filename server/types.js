"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInArgArray = isInArgArray;
exports.isHeaderItem = isHeaderItem;
exports.isHeaderArray = isHeaderArray;
exports.isQueryParamItem = isQueryParamItem;
exports.isQueryParamArray = isQueryParamArray;
exports.isNoneAuth = isNoneAuth;
exports.isBearerAuth = isBearerAuth;
exports.isOAuth2Auth = isOAuth2Auth;
exports.isAuthConfig = isAuthConfig;
exports.isResponseMappingArray = isResponseMappingArray;
exports.isStringRecord = isStringRecord;
exports.isJwtPayload = isJwtPayload;
exports.isLiteralValue = isLiteralValue;
exports.isSyntaxErrorWithStatus = isSyntaxErrorWithStatus;
/* Type guards */
function isInArgArray(v) {
    if (!Array.isArray(v))
        return false;
    return v.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item));
}
function isHeaderItem(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    const obj = v;
    return typeof obj.key === 'string';
}
function isHeaderArray(v) {
    if (!Array.isArray(v))
        return false;
    return v.every(isHeaderItem);
}
function isQueryParamItem(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    const obj = v;
    return typeof obj.key === 'string';
}
function isQueryParamArray(v) {
    if (!Array.isArray(v))
        return false;
    return v.every(isQueryParamItem);
}
function isNoneAuth(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    return v.type === 'none';
}
function isBearerAuth(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    return v.type === 'bearer';
}
function isOAuth2Auth(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    return v.type === 'oauth2_client_credentials';
}
function isAuthConfig(v) {
    return isNoneAuth(v) || isBearerAuth(v) || isOAuth2Auth(v);
}
function isResponseMappingArray(v) {
    if (!Array.isArray(v))
        return false;
    return v.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item));
}
function isStringRecord(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    return Object.values(v).every((val) => typeof val === 'string');
}
function isJwtPayload(v) {
    if (typeof v !== 'object' || v === null)
        return false;
    return true;
}
function isLiteralValue(v) {
    if (v === null || v === undefined)
        return true;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        return true;
    return false;
}
function isSyntaxErrorWithStatus(v) {
    if (!(v instanceof SyntaxError))
        return false;
    const obj = v;
    return 'status' in obj && 'body' in obj;
}
