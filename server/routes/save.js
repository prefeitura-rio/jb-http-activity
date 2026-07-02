"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = saveRoute;
const validateInArgs_1 = require("../lib/validateInArgs");
function saveRoute(req, res) {
    try {
        const result = (0, validateInArgs_1.validateInArgs)(req.body);
        if (!result.valid) {
            res.status(400).json({ error: result.error });
            return;
        }
        res.status(200).json({ status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro interno';
        res.status(500).json({ error: message });
    }
}
