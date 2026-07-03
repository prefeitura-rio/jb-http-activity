"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = lifecycleMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function lifecycleMiddleware(req, res, next) {
    if (process.env.JWT_DISABLED === 'true') {
        if (process.env.NODE_ENV === 'production') {
            res.status(500).json({ error: 'JWT_DISABLED nao permitido em producao' });
            return;
        }
        console.warn('[WARN] JWT_DISABLED ativo');
        next();
        return;
    }
    // If application/jwt, decode JWT and populate req.body
    if (req.headers['content-type'] === 'application/jwt' && Buffer.isBuffer(req.body) && req.body.length > 0) {
        try {
            const token = req.body.toString('utf8');
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const reqAny = req;
            reqAny.jwtPayload = decoded;
            req.body = typeof decoded.body === 'object'
                ? decoded.body
                : decoded;
            next();
            return;
        }
        catch (err) {
            res.status(401).json({ error: 'JWT invalido' });
            return;
        }
    }
    // If application/json (or any other format), pass through
    // express.json() already parsed the body
    next();
}
