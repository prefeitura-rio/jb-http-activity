import { evaluateExpression } from './expressionParser'
import { ResponseMappingItem, LiteralValue } from '../types'

export function extract(responseData: unknown, responseMapping: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (!Array.isArray(responseMapping)) return result

  const mappings = responseMapping as ResponseMappingItem[]

  for (const mapping of mappings) {
    if (!mapping.expression || !mapping.outputName) continue
    try {
      const value: LiteralValue = evaluateExpression(mapping.expression, responseData)
      result[mapping.outputName] = value != null ? value : null
    } catch {
      result[mapping.outputName] = null
    }
  }
  return result
}
