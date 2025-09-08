// 测试环境设置
import { beforeEach, vi } from 'vitest'

// 模拟 console 方法以减少测试输出
beforeEach(() => {
  // 静音 console.log, console.warn, console.error 但保留在测试中需要验证的情况
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// 模拟 window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:5173',
    href: 'http://localhost:5173',
  },
  writable: true,
})

// 模拟 MessageEvent 构造函数
global.MessageEvent = MessageEvent