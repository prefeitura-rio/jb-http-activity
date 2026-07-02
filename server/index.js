"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const jwtVerify_1 = __importDefault(require("./middleware/jwtVerify"));
const execute_1 = __importDefault(require("./routes/execute"));
const validate_1 = __importDefault(require("./routes/validate"));
const publish_1 = __importDefault(require("./routes/publish"));
const save_1 = __importDefault(require("./routes/save"));
const stop_1 = __importDefault(require("./routes/stop"));
const preview_1 = __importDefault(require("./routes/preview"));
const types_1 = require("./types");
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exitCode = 1;
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
const uiBasePath = (process.env.UI_BASE_PATH || '/').replace(/\/+$/, '') || '/';
const isSubPath = uiBasePath !== '/';
app.use(express_1.default.raw({
    type: 'application/jwt',
    limit: '10kb'
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((err, req, res, next) => {
    if ((0, types_1.isSyntaxErrorWithStatus)(err)) {
        res.status(400).json({ error: 'JSON invalido' });
        return;
    }
    next(err);
});
app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.exacttarget.com https://*.marketingcloudapps.com;");
    next();
});
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'dist')));
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
if (isSubPath) {
    app.use(uiBasePath, express_1.default.static(path_1.default.join(__dirname, '..', 'dist')));
    app.use(uiBasePath, express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
}
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});
if (isSubPath) {
    app.get(`${uiBasePath}/health`, (req, res) => {
        res.json({ status: 'ok', uptime: process.uptime() });
    });
}
app.post('/execute', jwtVerify_1.default, execute_1.default);
app.post('/validate', jwtVerify_1.default, validate_1.default);
app.post('/publish', jwtVerify_1.default, publish_1.default);
app.post('/save', jwtVerify_1.default, save_1.default);
app.post('/stop', jwtVerify_1.default, stop_1.default);
app.post('/preview', preview_1.default);
if (isSubPath) {
    app.post(`${uiBasePath}/execute`, jwtVerify_1.default, execute_1.default);
    app.post(`${uiBasePath}/validate`, jwtVerify_1.default, validate_1.default);
    app.post(`${uiBasePath}/publish`, jwtVerify_1.default, publish_1.default);
    app.post(`${uiBasePath}/save`, jwtVerify_1.default, save_1.default);
    app.post(`${uiBasePath}/stop`, jwtVerify_1.default, stop_1.default);
    app.post(`${uiBasePath}/preview`, preview_1.default);
}
const configJsPath = isSubPath ? `${uiBasePath}/config.js` : '/config.js';
const configJsonConfigJsPath = isSubPath ? `${uiBasePath}/config.json/config.js` : '/config.json/config.js';
const configJsonPath = isSubPath ? `${uiBasePath}/config.json` : '/config.json';
app.get(configJsPath, (req, res) => {
    res.redirect(configJsonPath);
});
app.get(configJsonConfigJsPath, (req, res) => {
    res.redirect(configJsonPath);
});
const server = app.listen(PORT, () => {
    console.log(`jb-http-activity running on port ${PORT}`);
});
process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});
