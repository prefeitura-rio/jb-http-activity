"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extract = extract;
const expressionParser_1 = require("./expressionParser");
function extract(responseData, responseMapping) {
    const result = {};
    if (!Array.isArray(responseMapping))
        return result;
    const mappings = responseMapping;
    for (const mapping of mappings) {
        if (!mapping.expression || !mapping.outputName)
            continue;
        try {
            const value = (0, expressionParser_1.evaluateExpression)(mapping.expression, responseData);
            result[mapping.outputName] = value != null ? value : null;
        }
        catch {
            result[mapping.outputName] = null;
        }
    }
    return result;
}
