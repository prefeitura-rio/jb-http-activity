export interface HeaderItem {
  key: string
  value?: string
}

export interface QueryParamItem {
  key: string
  value?: string
}

export interface NoneAuth {
  type: 'none'
}

export interface BearerAuth {
  type: 'bearer'
  token?: string
}

export interface OAuth2Auth {
  type: 'oauth2_client_credentials'
  tokenUrl?: string
  clientId?: string
  clientSecret?: string
  scope?: string
}

export type AuthConfig = NoneAuth | BearerAuth | OAuth2Auth

export interface ResponseMappingItem {
  expression?: string
  outputName?: string
  type?: string
}

export type InArgObject = Record<string, unknown>

export interface JwtPayload {
  body?: { inArguments?: InArgObject[] }
  inArguments?: InArgObject[]
  journeyId?: string
  contactKey?: string
  activityId?: string
  [key: string]: unknown
}

export type BodyData = string | URLSearchParams | FormData | Record<string, unknown> | null

export interface OutArgs {
  httpStatusCode: number
  httpStatusClass?: string
  httpSuccess: boolean
  [key: string]: unknown
}

export interface LogEntry {
  timestamp?: string
  journeyId?: string | null
  contactKey?: string | null
  activityId?: string | null
  method?: string
  url?: string
  httpStatus: number
  durationMs: number
  statusClass: string
  success: boolean
  treatErrorsAsOutput?: boolean | null
  outArguments?: OutArgs | null
  requestInput?: Record<string, unknown> | null
  deUpdateSuccess?: boolean | null
  deUpdateError?: string | null
  errorSummary: string | null
  message: string
}

export interface ValidationResultValid {
  valid: true
}

export interface ValidationResultInvalid {
  valid: false
  error: string
}

export type ValidationResult = ValidationResultValid | ValidationResultInvalid

export interface HttpRequestConfig {
  method?: string
  url?: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: BodyData
  timeout?: number
  retryCount?: number
  retryDelay?: number
}

export interface HttpResponse {
  status: number
  data: unknown
  attempts: number
}

export type LiteralValue = string | number | boolean | null | undefined

export interface SyntaxErrorWithStatus extends SyntaxError {
  status?: number
  body?: unknown
}

/* Type guards */

export function isInArgArray(v: unknown): v is InArgObject[] {
  if (!Array.isArray(v)) return false
  return v.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
}

export function isHeaderItem(v: unknown): v is HeaderItem {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return typeof obj.key === 'string'
}

export function isHeaderArray(v: unknown): v is HeaderItem[] {
  if (!Array.isArray(v)) return false
  return v.every(isHeaderItem)
}

export function isQueryParamItem(v: unknown): v is QueryParamItem {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return typeof obj.key === 'string'
}

export function isQueryParamArray(v: unknown): v is QueryParamItem[] {
  if (!Array.isArray(v)) return false
  return v.every(isQueryParamItem)
}

export function isNoneAuth(v: unknown): v is NoneAuth {
  if (typeof v !== 'object' || v === null) return false
  return (v as Record<string, unknown>).type === 'none'
}

export function isBearerAuth(v: unknown): v is BearerAuth {
  if (typeof v !== 'object' || v === null) return false
  return (v as Record<string, unknown>).type === 'bearer'
}

export function isOAuth2Auth(v: unknown): v is OAuth2Auth {
  if (typeof v !== 'object' || v === null) return false
  return (v as Record<string, unknown>).type === 'oauth2_client_credentials'
}

export function isAuthConfig(v: unknown): v is AuthConfig {
  return isNoneAuth(v) || isBearerAuth(v) || isOAuth2Auth(v)
}

export function isResponseMappingArray(v: unknown): v is ResponseMappingItem[] {
  if (!Array.isArray(v)) return false
  return v.every(
    (item) => typeof item === 'object' && item !== null && !Array.isArray(item)
  )
}

export function isStringRecord(v: unknown): v is Record<string, string> {
  if (typeof v !== 'object' || v === null) return false
  return Object.values(v).every((val) => typeof val === 'string')
}

export function isJwtPayload(v: unknown): v is JwtPayload {
  if (typeof v !== 'object' || v === null) return false
  return true
}

export function isLiteralValue(v: unknown): v is LiteralValue {
  if (v === null || v === undefined) return true
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return true
  return false
}

export function isSyntaxErrorWithStatus(v: unknown): v is SyntaxErrorWithStatus {
  if (!(v instanceof SyntaxError)) return false
  const obj = v as unknown as Record<string, unknown>
  return 'status' in obj && 'body' in obj
}
