"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const bigquery_1 = require("@google-cloud/bigquery");
const datasetId = process.env.BIGQUERY_DATASET || 'jb_http_activity';
const tableId = process.env.BIGQUERY_TABLE || 'logs';
let bigquery = null;
let pending = [];
let flushTimer = null;
function getClient() {
    if (!bigquery) {
        try {
            bigquery = new bigquery_1.BigQuery();
        }
        catch {
            return null;
        }
    }
    return bigquery;
}
function flush() {
    flushTimer = null;
    const batch = pending.splice(0);
    if (batch.length === 0)
        return;
    const client = getClient();
    if (!client) {
        for (const entry of batch) {
            try {
                console.log(JSON.stringify({ severity: 'BIGQUERY_FALLBACK', ...entry }));
            }
            catch {
                // ignore serialization errors
            }
        }
        return;
    }
    client
        .dataset(datasetId)
        .table(tableId)
        .insert(batch)
        .catch((err) => {
        for (const entry of batch) {
            try {
                const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
                console.error(JSON.stringify({
                    severity: 'BIGQUERY_ERROR',
                    error: errorMessage,
                    entry
                }));
            }
            catch {
                // ignore serialization errors
            }
        }
    });
}
function log(entry) {
    const row = {
        timestamp: entry.timestamp || new Date().toISOString(),
        journey_id: entry.journeyId || null,
        contact_key: entry.contactKey || null,
        activity_id: entry.activityId || null,
        method: entry.method || null,
        url: entry.url || null,
        http_status: entry.httpStatus || null,
        status_class: entry.statusClass || null,
        duration_ms: entry.durationMs || null,
        success: entry.success !== undefined ? entry.success : null,
        treat_errors_as_output: entry.treatErrorsAsOutput !== undefined ? entry.treatErrorsAsOutput : null,
        error_summary: entry.errorSummary || null,
        message: entry.message || null,
        out_arguments: entry.outArguments ? JSON.stringify(entry.outArguments) : null,
        environment: process.env.NODE_ENV || null
    };
    pending.push(row);
    if (!flushTimer) {
        flushTimer = setTimeout(flush, 10000);
    }
    if (pending.length >= 100) {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
        flush();
    }
}
