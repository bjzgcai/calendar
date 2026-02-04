/**
 * 从请求头中提取客户端 IP 地址
 * 支持常见的代理和负载均衡器头部
 */
export function getClientIp(request: Request): string | null {
  const headers = request.headers

  // 按优先级尝试不同的头部
  const ipSources = [
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip"),
    headers.get("cf-connecting-ip"), // Cloudflare
    headers.get("x-client-ip"),
    headers.get("forwarded")?.match(/for=([^;]+)/)?.[1],
  ]

  // 返回第一个有效的 IP 地址
  for (const ip of ipSources) {
    if (ip && ip !== "unknown") {
      return ip
    }
  }

  return null
}
