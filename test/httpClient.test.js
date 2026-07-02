"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const httpClient_1 = require("../server/lib/httpClient");
describe('httpClient - shouldRetry', function () {
    it('nao retry se attempt >= retryCount', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 0, null), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(1, 0, null), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(2, 1, null), false);
    });
    it('retry em caso de erro de rede (response null)', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 2, null), true);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(1, 2, null), true);
    });
    it('retry em caso de 5xx', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 500 }), true);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(1, 3, { status: 503 }), true);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(2, 3, { status: 502 }), true);
    });
    it('nao retry em caso de 4xx', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 400 }), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 401 }), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 404 }), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 422 }), false);
    });
    it('nao retry em caso de sucesso 2xx', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(0, 3, { status: 200 }), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(1, 3, { status: 201 }), false);
    });
    it('ultima tentativa nunca retry', function () {
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(2, 2, null), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(2, 2, { status: 503 }), false);
        assert_1.default.strictEqual((0, httpClient_1.shouldRetry)(3, 3, { status: 500 }), false);
    });
});
