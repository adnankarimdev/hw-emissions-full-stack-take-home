import { z } from "zod"

import { getPublicApiBaseUrl } from "@/lib/config/public-env"

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown
  ) {
    super(message)
    this.name = "ApiRequestError"
  }
}

export class ApiContractError extends Error {
  constructor(readonly payload: unknown) {
    super("Backend response did not match the expected API contract")
    this.name = "ApiContractError"
  }
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error.message
  }

  if (error instanceof ApiContractError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Something went wrong."
}

type RequestJsonOptions = RequestInit & {
  baseUrl?: string
}

type RequestApiDataOptions<TResponse> = RequestJsonOptions & {
  schema?: z.ZodType<TResponse>
}

const apiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: z.object({
    request_id: z.string(),
    timestamp: z.string(),
  }),
})

export async function requestJson<TResponse>(
  path: string,
  options: RequestApiDataOptions<TResponse> = {}
): Promise<TResponse> {
  const { baseUrl = getPublicApiBaseUrl(), headers, schema, ...init } = options
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })

  const payload = await readJson(response)

  if (!response.ok) {
    throw new ApiRequestError(
      getErrorMessage(payload),
      response.status,
      payload
    )
  }

  const envelopeResult = apiSuccessEnvelopeSchema.safeParse(payload)

  if (!envelopeResult.success) {
    throw new ApiContractError(payload)
  }

  const data = envelopeResult.data.data

  if (schema) {
    return schema.parse(data)
  }

  return data as TResponse
}

async function readJson(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  return JSON.parse(text) as unknown
}

function getErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message
  }

  return "Backend request failed"
}
