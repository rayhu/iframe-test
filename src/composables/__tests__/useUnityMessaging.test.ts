import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useUnityMessaging } from '../useUnityMessaging'
import type { AnimationCompleteData, UnityReadyData } from '../../types/unity'

// 模拟工具函数
vi.mock('../../utils/unity', () => ({
  generateRequestId: vi.fn(() => 'test-request-id-123'),
  isValidOrigin: vi.fn((origin: string) => {
    return ['http://localhost:5173', 'http://localhost:3000', window.location.origin].includes(
      origin,
    )
  }),
  TARGET_ORIGIN: 'https://cdn.fangmiaokeji.cn',
}))

describe('useUnityMessaging', () => {
  let mockIframe: HTMLIFrameElement
  let mockContentWindow: Pick<Window, 'postMessage'>
  let unityFrameRef: Ref<HTMLIFrameElement | null>
  let composable: ReturnType<typeof useUnityMessaging>

  beforeEach(() => {
    // 创建模拟的 iframe contentWindow
    mockContentWindow = {
      postMessage: vi.fn(),
    }

    // 创建模拟的 iframe 元素
    mockIframe = {
      contentWindow: mockContentWindow as unknown as Window,
    } as unknown as HTMLIFrameElement

    // 创建 ref
    unityFrameRef = ref<HTMLIFrameElement | null>(mockIframe as HTMLIFrameElement)

    // 初始化 composable
    composable = useUnityMessaging(unityFrameRef)

    // 清理所有定时器和事件监听器
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 清理
    if (composable) {
      composable.removeMessageListeners()
      composable.resetState()
    }
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('状态管理', () => {
    it('应该初始化所有状态为默认值', () => {
      const {
        isLoading,
        loadingProgress,
        loadError,
        isUnityReady,
        currentAvatarId,
        lastError,
        playingAnimations,
      } = composable

      expect(isLoading.value).toBe(false)
      expect(loadingProgress.value).toBe(0)
      expect(loadError.value).toBe(null)
      expect(isUnityReady.value).toBe(false)
      expect(currentAvatarId.value).toBe(null)
      expect(lastError.value).toBe(null)
      expect(playingAnimations.value.size).toBe(0)
    })

    it('resetState 应该重置所有状态到初始值', () => {
      const {
        isLoading,
        loadingProgress,
        loadError,
        isUnityReady,
        currentAvatarId,
        lastError,
        playingAnimations,
        resetState,
      } = composable

      // 修改一些状态
      isLoading.value = true
      loadingProgress.value = 50
      loadError.value = 'test error'
      isUnityReady.value = true
      currentAvatarId.value = 'test-avatar'
      lastError.value = 'last error'
      playingAnimations.value.add('test-animation')

      // 重置状态
      resetState()

      // 验证所有状态都被重置
      expect(isLoading.value).toBe(false)
      expect(loadingProgress.value).toBe(0)
      expect(loadError.value).toBe(null)
      expect(isUnityReady.value).toBe(false)
      expect(currentAvatarId.value).toBe(null)
      expect(lastError.value).toBe(null)
      expect(playingAnimations.value.size).toBe(0)
    })
  })

  describe('sendToUnity', () => {
    it('应该在 iframe 不可用时拒绝 Promise', async () => {
      // 设置 iframe 为 null
      unityFrameRef.value = null
      const { sendToUnity } = composable

      await expect(sendToUnity('play_ani', { ani_name: 'test' })).rejects.toThrow(
        'Unity iframe not available',
      )
    })

    it('应该在 contentWindow 不存在时拒绝 Promise', async () => {
      unityFrameRef.value = { contentWindow: null } as unknown as HTMLIFrameElement
      const { sendToUnity } = composable

      await expect(sendToUnity('play_ani', { ani_name: 'test' })).rejects.toThrow(
        'Unity iframe not available',
      )
    })

    it('应该正确发送消息到 Unity', async () => {
      vi.useFakeTimers()
      const { sendToUnity, setupMessageListeners } = composable

      // 设置消息监听器
      setupMessageListeners()

      // 启动发送操作
      const sendPromise = sendToUnity('play_ani', { ani_name: 'test-animation' })

      // 验证 postMessage 被调用
      expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
        JSON.stringify({
          command: 'play_ani',
          ani_name: 'test-animation',
          requestId: 'test-request-id-123',
        }),
        'https://cdn.fangmiaokeji.cn',
      )

      // 模拟收到完成消息
      const completeMessage: AnimationCompleteData = {
        status: 'completed',
        command: 'play_ani',
        requestId: 'test-request-id-123',
        ani_name: 'test-animation',
      }

      // 直接分发事件
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://cdn.fangmiaokeji.cn',
          data: completeMessage,
        }),
      )

      await expect(sendPromise).resolves.toBeUndefined()
      vi.useRealTimers()
    })

    it('应该在超时后拒绝 Promise', async () => {
      vi.useFakeTimers()
      const { sendToUnity } = composable

      const sendPromise = sendToUnity('play_ani', { ani_name: 'test-animation' })

      // 快进到超时
      vi.advanceTimersByTime(15001)

      await expect(sendPromise).rejects.toThrow('Timed out waiting for animation to complete')
      vi.useRealTimers()
    })
  })

  describe('playAnimation', () => {
    it('应该阻止重复播放相同动画', async () => {
      const { playAnimation, playingAnimations } = composable

      // 添加到正在播放列表
      playingAnimations.value.add('test-animation')

      await expect(playAnimation('test-animation')).rejects.toThrow('Animation already playing')
    })

    it('应该在成功时从播放列表中移除动画', async () => {
      vi.useFakeTimers()
      const { playAnimation, playingAnimations, setupMessageListeners } = composable

      // 设置消息监听器
      setupMessageListeners()

      const playPromise = playAnimation('test-animation')

      // 验证动画被添加到播放列表
      expect(playingAnimations.value.has('test-animation')).toBe(true)

      // 模拟收到完成消息
      const completeMessage: AnimationCompleteData = {
        status: 'completed',
        command: 'play_ani',
        requestId: 'test-request-id-123',
        ani_name: 'test-animation',
      }

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://cdn.fangmiaokeji.cn',
          data: completeMessage,
        }),
      )

      await playPromise

      // 验证动画从播放列表中移除
      expect(playingAnimations.value.has('test-animation')).toBe(false)
      vi.useRealTimers()
    })

    it('应该在失败时设置错误信息并从播放列表中移除动画', async () => {
      vi.useFakeTimers()
      const { playAnimation, playingAnimations, lastError } = composable

      const playPromise = playAnimation('test-animation')

      // 验证动画被添加到播放列表
      expect(playingAnimations.value.has('test-animation')).toBe(true)

      // 快进到超时
      vi.advanceTimersByTime(15001)

      await expect(playPromise).rejects.toThrow('Timed out waiting for animation to complete')
      // 验证错误信息被设置
      expect(lastError.value).toBe('Timed out waiting for animation to complete')
      // 验证动画从播放列表中移除
      expect(playingAnimations.value.has('test-animation')).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('消息处理', () => {
    it('应该处理 Unity 就绪消息', () => {
      const { isUnityReady, currentAvatarId, loadingProgress, setupMessageListeners } = composable

      // 设置消息监听器
      setupMessageListeners()

      const readyMessage: UnityReadyData = {
        type: 'unity-ready',
        avatarId: 'test-avatar-123',
      }

      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: readyMessage,
        }),
      )

      expect(isUnityReady.value).toBe(true)
      expect(currentAvatarId.value).toBe('test-avatar-123')
      expect(loadingProgress.value).toBe(100)
    })

    // 已移除进度与错误处理测试

    it('应该忽略来自无效来源的消息', () => {
      const { isUnityReady, setupMessageListeners } = composable

      // 设置消息监听器
      setupMessageListeners()

      const readyMessage: UnityReadyData = {
        type: 'unity-ready',
        avatarId: 'test-avatar-123',
      }

      // 从无效来源发送消息
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://malicious-site.com',
          data: readyMessage,
        }),
      )

      // 状态不应该改变
      expect(isUnityReady.value).toBe(false)
    })
  })

  describe('事件监听器管理', () => {
    it('setupMessageListeners 应该添加事件监听器', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const { setupMessageListeners } = composable

      setupMessageListeners()

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2)
      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('removeMessageListeners 应该移除事件监听器', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { setupMessageListeners, removeMessageListeners } = composable

      // 先设置监听器
      setupMessageListeners()
      // 然后移除
      removeMessageListeners()

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2)
      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
    })
  })

  describe('sendUnityReadyMessage', () => {
    it('应该向 window 发送就绪消息', () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')
      const { sendUnityReadyMessage } = composable

      sendUnityReadyMessage('test-avatar-123')

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'unity-ready',
          avatarId: 'test-avatar-123',
        },
        window.origin,
      )
    })
  })
})
