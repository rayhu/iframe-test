// Unity 相关的工具函数和常量

// 目标 Origin（更安全，避免使用 '*'）
export const TARGET_ORIGIN = 'https://cdn.fangmiaokeji.cn'

// 生成请求ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// 验证消息来源
export function isValidOrigin(origin: string): boolean {
  // 在开发环境允许本地源
  const allowedOrigins = [
    window.location.origin,
    // TODO: 以后需要删除这个
    'http://localhost:5173',
    'http://localhost:3000',
  ]
  return allowedOrigins.includes(origin)
}