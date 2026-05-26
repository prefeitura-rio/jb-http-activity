const assert = require('assert')
const { evaluateExpression, getByDotNotation } = require('../server/lib/expressionParser')
const { extract } = require('../server/lib/responseMapper')

const MOCK_RESPONSE = {
  boleto: { codigo: '03399.18391', url: 'https://pgm.rio/boleto/123' },
  divida: { valor: 1500.009, status: 'ATIVA' },
  cliente: { nome: '  joao  ' },
  error: { code: 'CPF_INVALIDO', message: 'CPF invalido' },
  dataVencimento: '2026-06-10',
  success: true,
  items: [{ id: 1, valor: 100 }, { id: 2, valor: 200 }],
  email: null,
  telefone: '21999999999'
}

describe('expressionParser', function() {
  describe('getByDotNotation', function() {
    it('extrai campo simples', function() {
      assert.strictEqual(getByDotNotation('boleto.codigo', MOCK_RESPONSE), '03399.18391')
    })
    it('extrai campo aninhado profundo', function() {
      assert.strictEqual(getByDotNotation('error.code', MOCK_RESPONSE), 'CPF_INVALIDO')
    })
    it('retorna null para caminho inexistente', function() {
      assert.strictEqual(getByDotNotation('foo.bar', MOCK_RESPONSE), null)
    })
    it('retorna null para obj null', function() {
      assert.strictEqual(getByDotNotation('foo.bar', null), null)
    })
  })

  describe('UPPER', function() {
    it('converte para maiusculas', function() {
      assert.strictEqual(evaluateExpression('UPPER(cliente.nome)', MOCK_RESPONSE), '  JOAO  ')
    })
    it('retorna null se valor null', function() {
      assert.strictEqual(evaluateExpression('UPPER(email)', MOCK_RESPONSE), null)
    })
  })

  describe('LOWER', function() {
    it('converte para minusculas', function() {
      assert.strictEqual(evaluateExpression('LOWER(boleto.codigo)', MOCK_RESPONSE), '03399.18391')
    })
  })

  describe('PROPER', function() {
    it('capitaliza palavras', function() {
      const result = evaluateExpression('PROPER(cliente.nome)', MOCK_RESPONSE)
      assert.ok(result.includes('Joao'))
    })
  })

  describe('TRIM', function() {
    it('remove espacos extras', function() {
      assert.strictEqual(evaluateExpression('TRIM(cliente.nome)', MOCK_RESPONSE), 'joao')
    })
  })

  describe('LEN', function() {
    it('retorna tamanho da string', function() {
      assert.strictEqual(evaluateExpression('LEN(boleto.codigo)', MOCK_RESPONSE), 11)
    })
    it('retorna 0 para null', function() {
      assert.strictEqual(evaluateExpression('LEN(email)', MOCK_RESPONSE), 0)
    })
  })

  describe('SUBSTR', function() {
    it('extrai substring', function() {
      assert.strictEqual(evaluateExpression('SUBSTR(boleto.codigo,0,5)', MOCK_RESPONSE), '03399')
    })
  })

  describe('CONCAT', function() {
    it('concatena valores', function() {
      assert.strictEqual(evaluateExpression('CONCAT("R$ ",boleto.codigo)', MOCK_RESPONSE), 'R$ 03399.18391')
    })
  })

  describe('ROUND', function() {
    it('arredonda para 2 casas', function() {
      assert.strictEqual(evaluateExpression('ROUND(divida.valor,2)', MOCK_RESPONSE), 1500.01)
    })
    it('arredonda para 0 casas', function() {
      assert.strictEqual(evaluateExpression('ROUND(divida.valor,0)', MOCK_RESPONSE), 1500)
    })
  })

  describe('ABS', function() {
    it('retorna valor absoluto', function() {
      assert.strictEqual(evaluateExpression('ABS(-1500)', null), 1500)
    })
  })

  describe('NUMBER', function() {
    it('converte string para numero', function() {
      assert.strictEqual(evaluateExpression('NUMBER("1500")', null), 1500)
    })
    it('retorna null para string invalida', function() {
      assert.strictEqual(evaluateExpression('NUMBER("abc")', null), null)
    })
  })

  describe('TEXT', function() {
    it('converte numero para texto', function() {
      assert.strictEqual(evaluateExpression('TEXT(1500)', null), '1500')
    })
  })

  describe('FORMAT', function() {
    it('formata data DD/MM', function() {
      assert.strictEqual(evaluateExpression('FORMAT(dataVencimento,"DD/MM")', MOCK_RESPONSE), '10/06')
    })
    it('formata data DD/MM/YYYY', function() {
      assert.strictEqual(evaluateExpression('FORMAT(dataVencimento,"DD/MM/YYYY")', MOCK_RESPONSE), '10/06/2026')
    })
  })

  describe('JSONSTR', function() {
    it('serializa objeto como JSON', function() {
      const result = evaluateExpression('JSONSTR(divida)', MOCK_RESPONSE)
      assert.ok(result.includes('"valor":1500.009'))
    })
  })

  describe('IF', function() {
    it('retorna then quando condicao verdadeira', function() {
      assert.strictEqual(evaluateExpression('IF(true,"sim","nao")', null), 'sim')
    })
    it('retorna else quando condicao falsa', function() {
      assert.strictEqual(evaluateExpression('IF(false,"sim","nao")', null), 'nao')
    })
    it('compara campo no response', function() {
      assert.strictEqual(evaluateExpression('IF(divida.status=="ATIVA","Em debito","Regular")', MOCK_RESPONSE), 'Em debito')
    })
  })

  describe('DEFAULT', function() {
    it('retorna fallback quando valor eh nulo', function() {
      assert.strictEqual(evaluateExpression('DEFAULT(email,"sem email")', MOCK_RESPONSE), 'sem email')
    })
    it('retorna valor quando nao nulo', function() {
      assert.strictEqual(evaluateExpression('DEFAULT(telefone,"sem tel")', MOCK_RESPONSE), '21999999999')
    })
  })

  describe('COALESCE', function() {
    it('retorna primeiro nao nulo', function() {
      assert.strictEqual(evaluateExpression('COALESCE(email,telefone,"sem contato")', MOCK_RESPONSE), '21999999999')
    })
    it('retorna ultimo fallback se todos nulos', function() {
      assert.strictEqual(evaluateExpression('COALESCE(email,null,"sem")', MOCK_RESPONSE), 'sem')
    })
  })

  describe('funcoes aninhadas', function() {
    it('UPPER(TRIM(x))', function() {
      assert.strictEqual(evaluateExpression('UPPER(TRIM(cliente.nome))', MOCK_RESPONSE), 'JOAO')
    })
    it('PROPER(TRIM(x))', function() {
      assert.strictEqual(evaluateExpression('PROPER(TRIM(cliente.nome))', MOCK_RESPONSE), 'Joao')
    })
  })

  describe('literais', function() {
    it('string literal com aspas simples', function() {
      assert.strictEqual(evaluateExpression("'fixo'", null), 'fixo')
    })
    it('string literal com aspas duplas', function() {
      assert.strictEqual(evaluateExpression('"fixo"', null), 'fixo')
    })
    it('numero literal', function() {
      assert.strictEqual(evaluateExpression('42', null), 42)
    })
    it('boolean true', function() {
      assert.strictEqual(evaluateExpression('true', null), true)
    })
  })
})

describe('responseMapper', function() {
  it('extrai outArguments com dot notation', function() {
    const result = extract(MOCK_RESPONSE, [
      { expression: 'boleto.codigo', outputName: 'codigoBoleto', type: 'text' },
      { expression: 'boleto.url', outputName: 'urlBoleto', type: 'text' }
    ])
    assert.strictEqual(result.codigoBoleto, '03399.18391')
    assert.strictEqual(result.urlBoleto, 'https://pgm.rio/boleto/123')
  })

  it('extrai outArguments com transformacao', function() {
    const result = extract(MOCK_RESPONSE, [
      { expression: 'UPPER(divida.status)', outputName: 'statusUpper', type: 'text' },
      { expression: 'ROUND(divida.valor,2)', outputName: 'valorFormat', type: 'number' }
    ])
    assert.strictEqual(result.statusUpper, 'ATIVA')
    assert.strictEqual(result.valorFormat, 1500.01)
  })

  it('retorna null para campo inexistente', function() {
    const result = extract(MOCK_RESPONSE, [
      { expression: 'foo.bar', outputName: 'inexistente', type: 'text' }
    ])
    assert.strictEqual(result.inexistente, null)
  })

  it('retorna objeto vazio para mapping vazio', function() {
    const result = extract(MOCK_RESPONSE, [])
    assert.deepStrictEqual(result, {})
  })

  it('retorna objeto vazio para null', function() {
    const result = extract(MOCK_RESPONSE, null)
    assert.deepStrictEqual(result, {})
  })
})
