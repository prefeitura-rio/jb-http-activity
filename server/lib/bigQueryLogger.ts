import { BigQuery } from '@google-cloud/bigquery'
import { LogEntry } from '../types'

const datasetId: string = process.env.BIGQUERY_DATASET || 'jb_http_activity'
const tableId: string = process.env.BIGQUERY_TABLE || 'logs'

let bigquery: BigQuery | null = null
let pending: Record<string, unknown>[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function getClient(): BigQuery | null {
  if (!bigquery) {
    try {
      bigquery = new BigQuery()
    } catch {
      return null
    }
  }
  return bigquery
}

function flush(): void {
  flushTimer = null
  const batch: Record<string, unknown>[] = pending.splice(0)
  if (batch.length === 0) return

  const client: BigQuery | null = getClient()
  if (!client) {
    for (const entry of batch) {
      try {
        console.log(JSON.stringify({ severity: 'BIGQUERY_FALLBACK', ...entry }))
      } catch {
        // ignore serialization errors
      }
    }
    return
  }

  client
    .dataset(datasetId)
    .table(tableId)
    .insert(batch)
    .catch((err: unknown) => {
      // BigQuery insert errors (e.g. PartialFailureError from unknown/mismatched
      // fields) carry the real reason in err.errors, not err.message, which is
      // often empty/generic. Capture both so failures are actually diagnosable.
      const errorDetail: unknown = err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            errors: (err as Error & { errors?: unknown }).errors
          }
        : String(err)
      for (const entry of batch) {
        try {
          console.error(JSON.stringify({
            severity: 'BIGQUERY_ERROR',
            error: errorDetail,
            entry
          }))
        } catch {
          // ignore serialization errors
        }
      }
    })
}

export function log(entry: LogEntry): void {
  const row: Record<string, unknown> = {
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
  }

  pending.push(row)

  if (!flushTimer) {
    flushTimer = setTimeout(flush, 10000)
  }

  if (pending.length >= 100) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flush()
  }
}
