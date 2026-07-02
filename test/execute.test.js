"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const expressionParser_1 = require("../server/lib/expressionParser");
const responseMapper_1 = require("../server/lib/responseMapper");
const MOCK_RESPONSE = {
    nome: 'João Silva',
    cpf: '12345678901',
    endereco: {
        cidade: 'Rio de Janeiro',
        estado: 'RJ'
    },
    pedidos: [
        { id: 1, valor: 1500.005 },
        { id: 2, valor: 2300.45 }
    ],
    status: 'ATIVA',
    dataCadastro: '2024-05-15T10:30:00Z',
    vazio: null,
    objeto: { chave: 'valor', numero: 42 }
};
describe('expressionParser', function () {
    describe('getByDotNotation', function () {
        it('extrai campo simples', function () {
            assert_1.default.strictEqual((0, expressionParser_1.getByDotNotation)('nome', MOCK_RESPONSE), 'João Silva');
        });
        it('extrai campo aninhado profundo', function () {
            assert_1.default.strictEqual((0, expressionParser_1.getByDotNotation)('endereco.cidade', MOCK_RESPONSE), 'Rio de Janeiro');
        });
        it('retorna undefined para caminho inexistente', function () {
            assert_1.default.strictEqual((0, expressionParser_1.getByDotNotation)('inexistente', MOCK_RESPONSE), undefined);
        });
        it('retorna null para obj null', function () {
            assert_1.default.strictEqual((0, expressionParser_1.getByDotNotation)('teste', null), null);
        });
    });
    describe('UPPER', function () {
        it('converte para maiusculas', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('UPPER(nome)', MOCK_RESPONSE), 'JOÃO SILVA');
        });
        it('retorna null se valor null', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('UPPER(vazio)', MOCK_RESPONSE), null);
        });
    });
    describe('LOWER', function () {
        it('converte para minusculas', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('LOWER(nome)', MOCK_RESPONSE), 'joão silva');
        });
    });
    describe('PROPER', function () {
        it('capitaliza palavras', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('PROPER(nome)', MOCK_RESPONSE), 'João Silva');
        });
    });
    describe('TRIM', function () {
        it('remove espacos extras', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('TRIM(nome)', MOCK_RESPONSE), 'João Silva');
        });
    });
    describe('LEN', function () {
        it('retorna tamanho da string', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('LEN(cpf)', MOCK_RESPONSE), 11);
        });
        it('retorna 0 para null', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('LEN(vazio)', MOCK_RESPONSE), 0);
        });
    });
    describe('SUBSTR', function () {
        it('extrai substring', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('SUBSTR(cpf,0,3)', MOCK_RESPONSE), '123');
        });
    });
    describe('CONCAT', function () {
        it('concatena valores', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('CONCAT("R$", pedidos.0.valor)', MOCK_RESPONSE), 'R$1500.005');
        });
    });
    describe('ROUND', function () {
        it('arredonda para 2 casas', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('ROUND(pedidos.0.valor,2)', MOCK_RESPONSE), 1500.01);
        });
        it('arredonda para 0 casas', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('ROUND(pedidos.0.valor,0)', MOCK_RESPONSE), 1500);
        });
    });
    describe('ABS', function () {
        it('retorna valor absoluto', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('ABS(-1500)', MOCK_RESPONSE), 1500);
        });
    });
    describe('NUMBER', function () {
        it('converte string para numero', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('NUMBER("1500")', MOCK_RESPONSE), 1500);
        });
        it('retorna null para string invalida', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('NUMBER("abc")', MOCK_RESPONSE), null);
        });
    });
    describe('TEXT', function () {
        it('converte numero para texto', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('TEXT(1500)', MOCK_RESPONSE), '1500');
        });
    });
    describe('FORMAT', function () {
        it('formata data DD/MM', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('FORMAT(dataCadastro,"DD/MM")', MOCK_RESPONSE), '15/05');
        });
        it('formata data DD/MM/YYYY', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('FORMAT(dataCadastro,"DD/MM/YYYY")', MOCK_RESPONSE), '15/05/2024');
        });
    });
    describe('JSONSTR', function () {
        it('serializa objeto como JSON', function () {
            const result = (0, expressionParser_1.evaluateExpression)('JSONSTR(objeto)', MOCK_RESPONSE);
            assert_1.default.strictEqual(typeof result, 'string');
            if (typeof result === 'string') {
                const parsed = JSON.parse(result);
                assert_1.default.strictEqual(parsed.chave, 'valor');
                assert_1.default.strictEqual(parsed.numero, 42);
            }
        });
    });
    describe('IF', function () {
        it('retorna then quando condicao verdadeira', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('IF(true,"sim","nao")', MOCK_RESPONSE), 'sim');
        });
        it('retorna else quando condicao falsa', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('IF(false,"sim","nao")', MOCK_RESPONSE), 'nao');
        });
        it('compara campo no response', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('IF(status=="ATIVA","sim","nao")', MOCK_RESPONSE), 'sim');
        });
    });
    describe('DEFAULT', function () {
        it('retorna fallback quando valor eh nulo', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('DEFAULT(vazio,"—")', MOCK_RESPONSE), '—');
        });
        it('retorna valor quando nao nulo', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('DEFAULT(nome,"—")', MOCK_RESPONSE), 'João Silva');
        });
    });
    describe('COALESCE', function () {
        it('retorna primeiro nao nulo', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('COALESCE(vazio,nome,"fallback")', MOCK_RESPONSE), 'João Silva');
        });
        it('retorna ultimo fallback se todos nulos', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('COALESCE(vazio,vazio,"ok")', MOCK_RESPONSE), 'ok');
        });
    });
    describe('funcoes aninhadas', function () {
        it('UPPER(TRIM(x))', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('UPPER(TRIM(nome))', MOCK_RESPONSE), 'JOÃO SILVA');
        });
        it('PROPER(TRIM(x))', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('PROPER(TRIM(nome))', MOCK_RESPONSE), 'João Silva');
        });
    });
    describe('literais', function () {
        it('string literal com aspas simples', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)("'texto'", MOCK_RESPONSE), 'texto');
        });
        it('string literal com aspas duplas', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('"texto"', MOCK_RESPONSE), 'texto');
        });
        it('numero literal', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('42', MOCK_RESPONSE), 42);
        });
        it('boolean true', function () {
            assert_1.default.strictEqual((0, expressionParser_1.evaluateExpression)('true', MOCK_RESPONSE), true);
        });
    });
});
describe('responseMapper', function () {
    it('extrai outArguments com dot notation', function () {
        const result = (0, responseMapper_1.extract)(MOCK_RESPONSE, [
            { expression: 'nome', outputName: 'nomeCliente' },
            { expression: 'endereco.cidade', outputName: 'cidade' }
        ]);
        assert_1.default.strictEqual(result.nomeCliente, 'João Silva');
        assert_1.default.strictEqual(result.cidade, 'Rio de Janeiro');
    });
    it('extrai outArguments com transformacao', function () {
        const result = (0, responseMapper_1.extract)(MOCK_RESPONSE, [
            { expression: 'UPPER(nome)', outputName: 'nomeMaiusculo' }
        ]);
        assert_1.default.strictEqual(result.nomeMaiusculo, 'JOÃO SILVA');
    });
    it('retorna null para campo inexistente', function () {
        const result = (0, responseMapper_1.extract)(MOCK_RESPONSE, [
            { expression: 'campoInexistente', outputName: 'inexistente' }
        ]);
        assert_1.default.strictEqual(result.inexistente, null);
    });
    it('retorna objeto vazio para mapping vazio', function () {
        const result = (0, responseMapper_1.extract)(MOCK_RESPONSE, []);
        assert_1.default.deepStrictEqual(result, {});
    });
    it('retorna objeto vazio para null', function () {
        const result = (0, responseMapper_1.extract)(MOCK_RESPONSE, null);
        assert_1.default.deepStrictEqual(result, {});
    });
});
