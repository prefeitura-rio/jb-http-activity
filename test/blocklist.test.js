"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const blocklist_1 = require("../server/lib/blocklist");
describe('blocklist - validateUrl', function () {
    // timeout set via mocha config in package.json
    it('rejeita URL mal formatada', async function () {
        const result = await (0, blocklist_1.validateUrl)('not-a-url');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('URL'));
    });
    it('rejeita protocolo nao HTTP', async function () {
        const result = await (0, blocklist_1.validateUrl)('ftp://example.com');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('Protocolo'));
    });
    it('rejeita localhost', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://localhost:3000/test');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('localhost'));
    });
    it('rejeita IP loopback 127.0.0.1', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://127.0.0.1:8080/api');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('loopback'));
    });
    it('rejeita IP privado 10.x', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://10.0.0.1/api');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('private-10'));
    });
    it('rejeita IP privado 192.168.x', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://192.168.1.1/api');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('private-192'));
    });
    it('rejeita IP privado 172.16-31.x', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://172.16.0.1/api');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('private-172'));
    });
    it('rejeita IP link-local 169.254.x', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://169.254.169.254/metadata');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('link-local'));
    });
    it('rejeita hostname metadata.google.internal', async function () {
        const result = await (0, blocklist_1.validateUrl)('http://metadata.google.internal/computeMetadata/v1/');
        assert_1.default.strictEqual(result.valid, false);
        assert_1.default.ok(result.error.includes('bloqueado'));
    });
    it('aceita URL publica valida', async function () {
        const result = await (0, blocklist_1.validateUrl)('https://jsonplaceholder.typicode.com/todos/1');
        assert_1.default.strictEqual(result.valid, true);
    });
    it('aceita URL publica com path e query', async function () {
        const result = await (0, blocklist_1.validateUrl)('https://api.exemplo.com/v1/dados?page=1');
        assert_1.default.strictEqual(result.valid, true);
    });
});
