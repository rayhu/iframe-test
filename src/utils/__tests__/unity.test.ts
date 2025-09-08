import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateRequestId, isValidOrigin, TARGET_ORIGIN } from '../unity'

describe('Unity Utils', () => {
  describe('generateRequestId', () => {
    it('应该生成唯一的请求ID', () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
    })

    it('应该包含时间戳和随机字符', () => {
      const id = generateRequestId()
      
      // 应该包含时间戳（数字）和连字符以及随机字符
      expect(id).toMatch(/^\d+-[a-z0-9]{6}$/)
    })
  })

  describe('isValidOrigin', () => {
    beforeEach(() => {
      // 重置 window.location.origin
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:5173',
        },
        writable: true,
      })
    })

    it('应该允许当前窗口的来源', () => {
      expect(isValidOrigin(window.location.origin)).toBe(true)
    })

    it('应该允许开发环境的本地源', () => {
      expect(isValidOrigin('http://localhost:5173')).toBe(true)
      expect(isValidOrigin('http://localhost:3000')).toBe(true)
    })

    it('应该拒绝未知的来源', () => {
      expect(isValidOrigin('https://malicious-site.com')).toBe(false)
      expect(isValidOrigin('https://evil.example.com')).toBe(false)
      expect(isValidOrigin('')).toBe(false)
    })

    it('应该适应不同的 window.location.origin', () => {
      // 修改 window.location.origin
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://my-app.com',
        },
        writable: true,
      })

      expect(isValidOrigin('https://my-app.com')).toBe(true)
      expect(isValidOrigin('http://localhost:5173')).toBe(true) // 开发环境仍然允许
      expect(isValidOrigin('https://other-site.com')).toBe(false)
    })
  })

  describe('TARGET_ORIGIN', () => {
    it('应该是正确的 Unity CDN 源', () => {
      expect(TARGET_ORIGIN).toBe('https://cdn.fangmiaokeji.cn')
    })

    it('应该是一个有效的 HTTPS URL', () => {
      expect(TARGET_ORIGIN).toMatch(/^https:\/\//)
    })
  })
})