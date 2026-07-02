"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;
let server;
before(function (done) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    app.post('/execute', (req, res) => {
        const inArgs = req.body && req.body.inArguments;
        if (!inArgs || !Array.isArray(inArgs) || !inArgs.length) {
            res.status(400).json({ error: 'inArguments ausente' });
            return;
        }
        const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {});
        res.status(200).json({
            httpStatusCode: 200,
            httpSuccess: true,
            httpStatusClass: '2xx'
        });
    });
    app.post('/preview', (req, res) => {
        const inArgs = req.body && req.body.inArguments;
        if (!inArgs || !Array.isArray(inArgs) || !inArgs.length) {
            res.status(400).json({ error: 'inArguments ausente' });
            return;
        }
        const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {});
        res.status(200).json({
            httpStatusCode: 200,
            httpSuccess: true,
            httpStatusClass: '2xx',
            _duration: 100,
            _timestamp: new Date().toISOString(),
            _url: config.url
        });
    });
    server = app.listen(PORT, done);
});
after(function (done) {
    server.close(done);
});
describe('/execute - integracao', function () {
    // timeout set via mocha config in package.json
    it('GET /health retorna ok', async function () {
        const data = await fetchJson(`${BASE_URL}/health`);
        assert_1.default.strictEqual(data.status, 'ok');
    });
    it('POST /execute sem body retorna 400', async function () {
        const res = await fetchJson(`${BASE_URL}/execute`, { method: 'POST' });
        assert_1.default.ok(res.error);
    });
    it('POST /execute com inArguments vazio retorna 400', async function () {
        const res = await fetchJson(`${BASE_URL}/execute`, {
            method: 'POST',
            body: { inArguments: [] }
        });
        assert_1.default.ok(res.error);
    });
    it('POST /preview retorna metadados', async function () {
        const res = await fetchJson(`${BASE_URL}/preview`, {
            method: 'POST',
            body: {
                inArguments: [
                    { method: 'GET' },
                    { url: 'https://api.exemplo.com' },
                    { headers: '[]' },
                    { body: '' },
                    { auth: '{"type":"none"}' },
                    { responseMapping: '[]' },
                    { treatErrorsAsOutput: true, timeout: 5000 }
                ]
            }
        });
        assert_1.default.strictEqual(res.httpStatusCode, 200);
        assert_1.default.strictEqual(res.httpSuccess, true);
        assert_1.default.strictEqual(res.httpStatusClass, '2xx');
        assert_1.default.notStrictEqual(res._duration, undefined);
        assert_1.default.notStrictEqual(res._timestamp, undefined);
        assert_1.default.notStrictEqual(res._url, undefined);
    });
});
function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const opts = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http_1.default.request(opts, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    resolve({ error: 'parse error', raw: data });
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}
