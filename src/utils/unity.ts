// Unity 相关的工具函数和常量

// 目标 Origin（更安全，避免使用 '*'）
export const TARGET_ORIGIN = (import.meta.env.VITE_UNITY_TARGET_ORIGIN ||
  'https://cdn.fangmiaokeji.cn') as string

// 生成请求ID
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// 验证消息来源
export function isValidOrigin(origin: string): boolean {
  // 在开发环境允许本地源
  const allowedOrigins = [
    window.location.origin,
    'http://localhost:5173',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://localhost:3000',
    TARGET_ORIGIN,
  ]
  return allowedOrigins.includes(origin)
}

// 将图片文件转换为 base64 字符串
export async function imageToBase64(imagePath: string): Promise<string> {
  try {
    const response = await fetch(imagePath)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // 移除 data:image/png;base64, 前缀，只返回 base64 字符串
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to convert image to base64'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting image to base64:', error)
    throw error
  }
}
