import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack
  turbopack: {
    // Set a stable workspace root independent from shell cwd.
    root: projectRoot,
  },
}

export default nextConfig
