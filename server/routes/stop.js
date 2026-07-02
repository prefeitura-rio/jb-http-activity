"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = stopRoute;
function stopRoute(req, res) {
    try {
        res.status(200).json({ status: 'ok' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro interno';
        res.status(500).json({ error: message });
    }
}
