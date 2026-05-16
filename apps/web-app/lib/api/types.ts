export type ApiSuccessEnvelope<TData> = {
  success: true
  data: TData
  meta: {
    request_id: string
    timestamp: string
  }
}

export type ApiErrorEnvelope = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta: {
    request_id: string
    timestamp: string
  }
}
