import { LiteralValue, isLiteralValue } from '../types'

export function getByDotNotation(path: string, obj: unknown): unknown {
  if (!path || !obj) return null
  const keys: string[] = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function parseLiteral(value: string): LiteralValue {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined
  if (/^-?\d+\.?\d*$/.test(value)) return Number(value)
  const singleMatch: RegExpMatchArray | null = value.match(/^'(.*)'$/)
  if (singleMatch) return singleMatch[1]
  const doubleMatch: RegExpMatchArray | null = value.match(/^"(.*)"$/)
  if (doubleMatch) return doubleMatch[1]
  return value
}

function isDotNotation(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_.$]*$/.test(str) && str.includes('.')
}

function isSimplePath(str: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_.$]*$/.test(str)
}

function parseArguments(raw: string): string[] {
  const args: string[] = []
  let current: string = ''
  let depth: number = 0
  let inSingle: boolean = false
  let inDouble: boolean = false

  for (let i = 0; i < raw.length; i++) {
    const ch: string = raw[i]

    if (inSingle) {
      if (ch === "'") inSingle = false
      current += ch
      continue
    }

    if (inDouble) {
      if (ch === '"') inDouble = false
      current += ch
      continue
    }

    if (ch === "'" && !inDouble) {
      inSingle = true
      current += ch
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = true
      current += ch
      continue
    }

    if (ch === '(') {
      depth++
      current += ch
      continue
    }

    if (ch === ')') {
      depth--
      current += ch
      continue
    }

    if (ch === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  if (current.trim()) {
    args.push(current.trim())
  }

  return args
}

type TransformFn = (...args: unknown[]) => LiteralValue

const TRANSFORM_FUNCTIONS: Record<string, TransformFn> = {
  upper: (v: unknown): LiteralValue => {
    if (v == null) return null
    return String(v).toUpperCase()
  },
  lower: (v: unknown): LiteralValue => {
    if (v == null) return null
    return String(v).toLowerCase()
  },
  proper: (v: unknown): LiteralValue => {
    if (v == null) return null
    return String(v).replace(/\w\S*/g, (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  },
  trim: (v: unknown): LiteralValue => {
    if (v == null) return null
    return String(v).trim()
  },
  len: (v: unknown): LiteralValue => {
    if (v == null) return 0
    return String(v).length
  },
  substr: (v: unknown, i: unknown, n: unknown): LiteralValue => {
    if (v == null) return null
    const start: number = typeof i === 'number' ? i : Number(i) || 0
    const length: number = typeof n === 'number' ? n : Number(n) || 0
    return String(v).substr(start, length)
  },
  concat: (...args: unknown[]): LiteralValue => args.map(a => a == null ? '' : String(a)).join(''),
  round: (v: unknown, n: unknown): LiteralValue => {
    if (v == null) return null
    const factor: number = Math.pow(10, typeof n === 'number' ? n : (Number(n) || 0))
    return Math.round(Number(v) * factor) / factor
  },
  abs: (v: unknown): LiteralValue => {
    if (v == null) return null
    return Math.abs(Number(v))
  },
  number: (v: unknown): LiteralValue => {
    if (v == null) return null
    const n: number = Number(v)
    return isNaN(n) ? null : n
  },
  text: (v: unknown): LiteralValue => {
    if (v == null) return null
    return String(v)
  },
  format: (v: unknown, fmt: unknown): LiteralValue => {
    if (v == null) return null
    const s: string = String(v)
    if (fmt == null) return s
    const fmtStr: string = String(fmt)
    if (fmtStr === 'DD/MM' || fmtStr === 'DD/MM/YYYY') {
      const d: Date = new Date(s)
      if (!isNaN(d.getTime())) {
        const day: string = String(d.getUTCDate()).padStart(2, '0')
        const month: string = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year: number = d.getUTCFullYear()
        if (fmtStr === 'DD/MM') return `${day}/${month}`
        return `${day}/${month}/${year}`
      }
    }
    if (fmtStr === 'YYYY-MM-DD') {
      const d: Date = new Date(s)
      if (!isNaN(d.getTime())) {
        const day: string = String(d.getUTCDate()).padStart(2, '0')
        const month: string = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year: number = d.getUTCFullYear()
        return `${year}-${month}-${day}`
      }
    }
    return s
  },
  jsonstr: (v: unknown): LiteralValue => {
    if (v == null) return null
    try {
      return JSON.stringify(v)
    } catch {
      return null
    }
  },
  if: (cond: unknown, thenVal: unknown, elseVal: unknown): LiteralValue => {
    return cond ? (thenVal as LiteralValue) : (elseVal as LiteralValue)
  },
  default: (v: unknown, fb: unknown): LiteralValue => {
    return (v == null || v === undefined || v === '') ? (fb as LiteralValue) : (v as LiteralValue)
  },
  coalesce: (...args: unknown[]): LiteralValue => {
    for (const arg of args) {
      if (arg != null && arg !== undefined) return arg as LiteralValue
    }
    return null
  }
}

export function evaluateExpression(expression: string, responseData: unknown): LiteralValue {
  if (!expression) return null

  const trimmed: string = expression.trim()

  if (trimmed.includes('(') === false) {
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1)
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1)
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null
    if (/^-?\d+\.?\d*$/.test(trimmed)) return Number(trimmed)
    if (isDotNotation(trimmed) || isSimplePath(trimmed)) {
      const val: unknown = getByDotNotation(trimmed, responseData)
      if (isLiteralValue(val)) return val
      return null
    }
    return trimmed
  }

  const match: RegExpMatchArray | null = trimmed.match(/^(\w+)\((.+)\)$/)
  if (!match) return null

  const fnName: string = match[1].toLowerCase()
  const argsRaw: string[] = parseArguments(match[2])

  if (!TRANSFORM_FUNCTIONS[fnName]) return null

  const args: unknown[] = argsRaw.map((arg: string) => {
    const argTrimmed: string = arg.trim()
    const compMatch: RegExpMatchArray | null = argTrimmed.match(/^(.*?)\s*(==|!=)\s*(.*)$/)
    if (compMatch && fnName === 'if') {
      const left: LiteralValue = resolveValue(compMatch[1].trim(), responseData)
      const right: LiteralValue = resolveValue(compMatch[3].trim(), responseData)
      if (compMatch[2] === '==') return left == right
      return left != right
    }
    if (argTrimmed.includes('(')) return evaluateExpression(argTrimmed, responseData)
    if (argTrimmed.startsWith("'") && argTrimmed.endsWith("'")) return argTrimmed.slice(1, -1)
    if (argTrimmed.startsWith('"') && argTrimmed.endsWith('"')) return argTrimmed.slice(1, -1)
    if (argTrimmed === 'true') return true
    if (argTrimmed === 'false') return false
    if (argTrimmed === 'null') return null
    if (/^-?\d+\.?\d*$/.test(argTrimmed)) return Number(argTrimmed)
    if (isDotNotation(argTrimmed) || isSimplePath(argTrimmed)) {
      const val: unknown = getByDotNotation(argTrimmed, responseData)
      return val !== undefined ? val : null
    }
    return argTrimmed
  })

  try {
    return TRANSFORM_FUNCTIONS[fnName](...args)
  } catch {
    return null
  }
}

function resolveValue(raw: string, responseData: unknown): LiteralValue {
  const trimmed: string = raw.trim()

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1)
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1)
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+\.?\d*$/.test(trimmed)) return Number(trimmed)
  if (isDotNotation(trimmed) || isSimplePath(trimmed)) {
    const val: unknown = getByDotNotation(trimmed, responseData)
    if (val !== undefined) {
      if (isLiteralValue(val)) return val
    }
    return trimmed
  }
  return trimmed
}
