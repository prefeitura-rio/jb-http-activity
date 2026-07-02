"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const axios_1 = __importDefault(require("axios"));
const authHandler_1 = require("../server/lib/authHandler");
describe('authHandler', function () {
    describe('None', function () {
        it('retorna objeto vazio se type for none', async function () {
            const result = await (0, authHandler_1.resolveAuth)({ type: 'none' });
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se config for null', async function () {
            const result = await (0, authHandler_1.resolveAuth)(null);
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se config for undefined', async function () {
            const result = await (0, authHandler_1.resolveAuth)(undefined);
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se type for desconhecido', async function () {
            const result = await (0, authHandler_1.resolveAuth)({ type: 'unknown' });
            assert_1.default.deepStrictEqual(result, {});
        });
    });
    describe('Bearer', function () {
        it('retorna header Authorization com token', async function () {
            const result = await (0, authHandler_1.resolveAuth)({ type: 'bearer', token: 'meu-token' });
            assert_1.default.deepStrictEqual(result, { Authorization: 'Bearer meu-token' });
        });
        it('retorna objeto vazio se token for vazio', async function () {
            const result = await (0, authHandler_1.resolveAuth)({ type: 'bearer', token: '' });
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se token for undefined', async function () {
            const result = await (0, authHandler_1.resolveAuth)({ type: 'bearer' });
            assert_1.default.deepStrictEqual(result, {});
        });
    });
    describe('OAuth2 Client Credentials', function () {
        let originalPost;
        beforeEach(function () {
            originalPost = axios_1.default.post;
        });
        afterEach(function () {
            axios_1.default.post = originalPost;
        });
        it('retorna header com token recebido do provider', async function () {
            axios_1.default.post = async () => ({ data: { access_token: 'oauth-token-123' } });
            const result = await (0, authHandler_1.resolveAuth)({
                type: 'oauth2_client_credentials',
                tokenUrl: 'https://auth.exemplo.com/token',
                clientId: 'meu-client-id',
                clientSecret: 'meu-client-secret'
            });
            assert_1.default.deepStrictEqual(result, { Authorization: 'Bearer oauth-token-123' });
        });
        it('envia scope se informado', async function () {
            let capturedParams = null;
            const mockPost = async (_url, _body, config) => {
                capturedParams = config.params || null;
                return { data: { access_token: 'token' } };
            };
            axios_1.default.post = mockPost;
            await (0, authHandler_1.resolveAuth)({
                type: 'oauth2_client_credentials',
                tokenUrl: 'https://auth.exemplo.com/token',
                clientId: 'id',
                clientSecret: 'secret',
                scope: 'read write'
            });
            const params = capturedParams;
            assert_1.default.strictEqual(params?.scope, 'read write');
        });
        it('retorna objeto vazio se tokenUrl faltar', async function () {
            const result = await (0, authHandler_1.resolveAuth)({
                type: 'oauth2_client_credentials',
                clientId: 'id',
                clientSecret: 'secret'
            });
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se clientId faltar', async function () {
            const result = await (0, authHandler_1.resolveAuth)({
                type: 'oauth2_client_credentials',
                tokenUrl: 'https://auth.exemplo.com/token',
                clientSecret: 'secret'
            });
            assert_1.default.deepStrictEqual(result, {});
        });
        it('retorna objeto vazio se clientSecret faltar', async function () {
            const result = await (0, authHandler_1.resolveAuth)({
                type: 'oauth2_client_credentials',
                tokenUrl: 'https://auth.exemplo.com/token',
                clientId: 'id'
            });
            assert_1.default.deepStrictEqual(result, {});
        });
    });
});
