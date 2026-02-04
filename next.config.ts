import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16 默认使用 Turbopack
  turbopack: {
    // 设置 workspace root 以消除多 lockfile 警告
    root: process.cwd(),
  },
}

export default nextConfig
