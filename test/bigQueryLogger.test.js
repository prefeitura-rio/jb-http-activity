"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bigQueryLogger_1 = require("../server/lib/bigQueryLogger");
describe('bigQueryLogger', function () {
    it('aceita log com dados completos', function () {
        (0, bigQueryLogger_1.log)({
            journeyId: 'j-123',
            contactKey: 'ck-456',
            activityId: null,
            method: 'POST',
            url: 'https://api.exemplo.com',
            httpStatus: 200,
            statusClass: '2xx',
            durationMs: 150,
            success: true,
            treatErrorsAsOutput: false,
            outArguments: { httpStatusCode: 200, httpSuccess: true },
            errorSummary: null,
            message: 'HTTP 200 (150ms)'
        });
    });
    it('aceita log com dados minimos', function () {
        (0, bigQueryLogger_1.log)({
            journeyId: null,
            contactKey: null,
            activityId: null,
            method: 'GET',
            url: '/test',
            httpStatus: 500,
            durationMs: 0,
            statusClass: '',
            success: false,
            treatErrorsAsOutput: false,
            outArguments: null,
            errorSummary: null,
            message: ''
        });
    });
    it('aceita multiplas entradas sem erro', function () {
        for (let i = 0; i < 10; i++) {
            (0, bigQueryLogger_1.log)({
                journeyId: null,
                contactKey: null,
                activityId: null,
                method: 'GET',
                url: '/test',
                httpStatus: 200,
                durationMs: 10 * i,
                statusClass: '2xx',
                success: true,
                treatErrorsAsOutput: null,
                outArguments: null,
                errorSummary: null,
                message: ''
            });
        }
    });
    it('trata outArguments como objeto', function () {
        (0, bigQueryLogger_1.log)({
            journeyId: null,
            contactKey: null,
            activityId: null,
            method: 'GET',
            url: '/test',
            httpStatus: 200,
            durationMs: 0,
            statusClass: '',
            success: true,
            treatErrorsAsOutput: null,
            outArguments: { httpStatusCode: 200, httpSuccess: true },
            errorSummary: null,
            message: ''
        });
    });
    it('usa NODE_ENV como environment', function () {
        process.env.NODE_ENV = 'test-env';
        (0, bigQueryLogger_1.log)({
            journeyId: null,
            contactKey: null,
            activityId: null,
            method: 'GET',
            url: '/test',
            httpStatus: 200,
            durationMs: 0,
            statusClass: '2xx',
            success: true,
            treatErrorsAsOutput: null,
            outArguments: null,
            errorSummary: null,
            message: ''
        });
    });
});
