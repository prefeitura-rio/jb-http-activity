const { evaluateExpression } = require('./expressionParser')

function extract(responseData, responseMapping) {
  if (!responseMapping || !Array.isArray(responseMapping)) return {}

  const result = {}
  for (const mapping of responseMapping) {
    if (!mapping.expression || !mapping.outputName) continue
    try {
      const value = evaluateExpression(mapping.expression, responseData)
      result[mapping.outputName] = value != null ? value : null
    } catch {
      result[mapping.outputName] = null
    }
  }
  return result
}

module.exports = { extract }
