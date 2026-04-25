type HeaderSource = {
  headers: {
    get(name: string): string | null
  }
}

export function hasValidInternalApiKey(request: HeaderSource): boolean {
  const expectedApiKey = process.env.THIRD_PARTY_API_KEY?.trim()
  if (!expectedApiKey) {
    return false
  }

  const providedApiKey = request.headers.get("x-api-key")?.trim()
  return providedApiKey === expectedApiKey
}
