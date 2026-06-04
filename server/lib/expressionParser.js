function getByDotNotation(path, obj) {
  if (!path || !obj) return null
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return null
    current = current[key]
  }
  return current
}

function parseLiteral(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined
  if (/^-?\d+\.?\d*$/.test(value)) return Number(value)
  const singleMatch = value.match(/^'(.*)'$/)
  if (singleMatch) return singleMatch[1]
  const doubleMatch = value.match(/^"(.*)"$/)
  if (doubleMatch) return doubleMatch[1]
  return value
}

function isDotNotation(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_.$]*$/.test(str) && str.includes('.')
}

function isSimplePath(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_.$]*$/.test(str)
}

function parseArguments(raw) {
  const args = []
  let current = ''
  let depth = 0
  let inSingle = false
  let inDouble = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]

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

const TRANSFORM_FUNCTIONS = {
  upper: (v) => {
    if (v == null) return null
    return String(v).toUpperCase()
  },
  lower: (v) => {
    if (v == null) return null
    return String(v).toLowerCase()
  },
  proper: (v) => {
    if (v == null) return null
    return String(v).replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  },
  trim: (v) => {
    if (v == null) return null
    return String(v).trim()
  },
  len: (v) => {
    if (v == null) return 0
    return String(v).length
  },
  substr: (v, i, n) => {
    if (v == null) return null
    return String(v).substr(i, n)
  },
  concat: (...args) => args.map(a => a == null ? '' : String(a)).join(''),
  round: (v, n) => {
    if (v == null) return null
    const factor = Math.pow(10, n || 0)
    return Math.round(Number(v) * factor) / factor
  },
  abs: (v) => {
    if (v == null) return null
    return Math.abs(Number(v))
  },
  number: (v) => {
    if (v == null) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  },
  text: (v) => {
    if (v == null) return null
    return String(v)
  },
  format: (v, fmt) => {
    if (v == null) return null
    const s = String(v)
    if (!fmt) return s
    const fmtStr = String(fmt)
    if (fmtStr === 'DD/MM' || fmtStr === 'DD/MM/YYYY') {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0')
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year = d.getUTCFullYear()
        if (fmtStr === 'DD/MM') return `${day}/${month}`
        return `${day}/${month}/${year}`
      }
    }
    if (fmtStr === 'YYYY-MM-DD') {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0')
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const year = d.getUTCFullYear()
        return `${year}-${month}-${day}`
      }
    }
    return s
  },
  jsonstr: (v) => {
    if (v == null) return null
    try {
      return JSON.stringify(v)
    } catch {
      return null
    }
  },
  if: (cond, thenVal, elseVal) => {
    return cond ? thenVal : elseVal
  },
  default: (v, fb) => {
    return (v == null || v === undefined || v === '') ? fb : v
  },
  coalesce: (...args) => {
    for (const arg of args) {
      if (arg != null && arg !== undefined) return arg
    }
    return null
  }
}

function evaluateExpression(expression, responseData) {
  if (!expression) return null

  const trimmed = expression.trim()

  if (!trimmed.includes('(')) {
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1)
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1)
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (trimmed === 'null') return null
    if (/^-?\d+\.?\d*$/.test(trimmed)) return Number(trimmed)
    if (isDotNotation(trimmed) || isSimplePath(trimmed)) {
      return getByDotNotation(trimmed, responseData)
    }
    return trimmed
  }

  const match = trimmed.match(/^(\w+)\((.+)\)$/)
  if (!match) return null

  const fnName = match[1].toLowerCase()
  const argsRaw = parseArguments(match[2])

  if (!TRANSFORM_FUNCTIONS[fnName]) return null

  const args = argsRaw.map(arg => {
    const argTrimmed = arg.trim()
    const compMatch = argTrimmed.match(/^(.*?)\s*(==|!=)\s*(.*)$/)
    if (compMatch && fnName === 'if') {
      const left = resolveValue(compMatch[1].trim(), responseData)
      const right = resolveValue(compMatch[3].trim(), responseData)
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
      return getByDotNotation(argTrimmed, responseData)
    }
    return argTrimmed
  })

  try {
    return TRANSFORM_FUNCTIONS[fnName](...args)
  } catch {
    return null
  }
}

function resolveValue(raw, responseData) {
  const trimmed = raw.trim()

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1)
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1)
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (/^-?\d+\.?\d*$/.test(trimmed)) return Number(trimmed)
  if (isDotNotation(trimmed) || isSimplePath(trimmed)) {
    const val = getByDotNotation(trimmed, responseData)
    return val !== undefined ? val : trimmed
  }
  return trimmed
}

module.exports = { evaluateExpression, getByDotNotation }
