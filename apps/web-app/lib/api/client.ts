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

type RequestJsonOptions = RequestInit & {
  baseUrl?: string
}

export async function requestJson<TResponse>(
  path: string,
  options: RequestJsonOptions = {}
): Promise<TResponse> {
  const { baseUrl = getPublicApiBaseUrl(), headers, ...init } = options
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })

  const payload = await readJson(response)

  if (!response.ok) {
    throw new ApiRequestError("Backend request failed", response.status, payload)
  }

  return payload as TResponse
}

async function readJson(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  return JSON.parse(text) as unknown
}
