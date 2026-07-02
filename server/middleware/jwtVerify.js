"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = jwtVerify;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
function jwtVerify(req, res, next) {
    if (process.env.JWT_DISABLED === 'true') {
        if (process.env.NODE_ENV === 'production') {
            res.status(500).json({ error: 'JWT_DISABLED nao permitido em producao' });
            return;
        }
        console.warn('[WARN] JWT_DISABLED ativo');
        next();
        return;
    }
    if (req.headers['content-type'] !== 'application/jwt') {
        res.status(400).json({ error: 'Content-Type deve ser application/jwt' });
        return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: 'Body vazio' });
        return;
    }
    try {
        const token = req.body.toString('utf8');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if ((0, types_1.isJwtPayload)(decoded)) {
            const reqAny = req;
            reqAny.jwtPayload = decoded;
            req.body = typeof decoded.body === 'object' && decoded.body !== null ? decoded.body : decoded;
        }
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'JWT invalido' });
    }
}
