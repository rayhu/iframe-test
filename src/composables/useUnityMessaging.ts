import { ref, type Ref } from 'vue'
import type {
  UnityMessage,
  AnimationRequest,
  QueuedMessage,
  UnityReadyData,
  AnimationCompleteData
} from '../types/unity'
import { generateRequestId, isValidOrigin, TARGET_ORIGIN } from '../utils/unity'

export function useUnityMessaging(unityFrame: Ref<HTMLIFrameElement | null>) {
  // 状态管理
  const isLoading = ref(false)
  const loadingProgress = ref(0)
  const loadError = ref<string | null>(null)
  const isUnityReady = ref(false)
  const currentAvatarId = ref<string | null>(null)
  const messageQueue = ref<QueuedMessage[]>([])
  const lastError = ref<string | null>(null)
  const playingAnimations = ref(new Set<string>())

  // 请求跟踪，用于在"动画完成"时 resolve
  const pendingRequests = new Map<string, AnimationRequest>()

  // 处理消息队列
  function flushMessageQueue() {
    if (messageQueue.value.length === 0) return

    console.log(`📤 Flushing ${messageQueue.value.length} queued messages to Unity`)

    messageQueue.value.forEach(({ kind, msg }) => {
      sendToUnity(kind, msg).catch(error => {
        console.error('Failed to send queued message:', error)
      })
    })

    messageQueue.value = []
  }

  // 发送消息到 Unity；返回 Promise，在动画完成时 resolve
  function sendToUnity(kind: string, msg: { ani_name: string }): Promise<void> {
    if (!unityFrame.value?.contentWindow) {
      console.error('❌ Unity iframe not available')
      return Promise.reject(new Error('Unity iframe not available'))
    }

    const requestId = generateRequestId()
    const message: UnityMessage = { command: kind, ani_name: msg.ani_name, requestId }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        pendingRequests.delete(requestId)
        reject(new Error('Timed out waiting for animation to complete'))
      }, 15000)

      pendingRequests.set(requestId, { aniName: msg.ani_name, resolve, reject, timeoutId })

      try {
        unityFrame.value!.contentWindow!.postMessage(JSON.stringify(message), TARGET_ORIGIN)
        console.log('📤 Sent to Unity:', message)
      } catch (error) {
        clearTimeout(timeoutId)
        pendingRequests.delete(requestId)
        reject(error)
      }
    })
  }

  // 播放动画，带重复检查和状态管理
  function playAnimation(aniActualName: string): Promise<void> {
    // 防止重复点击
    if (playingAnimations.value.has(aniActualName)) {
      console.warn('⚠️ Animation already playing:', aniActualName)
      return Promise.reject(new Error('Animation already playing'))
    }

    // 添加到正在播放的动画集合
    playingAnimations.value.add(aniActualName)
    lastError.value = null

    // 返回 Promise：可在代码中 await，获知何时完成
    return sendToUnity('play_ani', { ani_name: aniActualName })
      .then(() => {
        playingAnimations.value.delete(aniActualName)
      })
      .catch((error) => {
        playingAnimations.value.delete(aniActualName)
        lastError.value = error.message || 'Animation failed'
        throw error
      })
  }

  // 动作完成消息处理
  function handleAnimationDoneMessage(evt: MessageEvent) {
    // 放松：允许通过工具方法校验来源
    if (!isValidOrigin(evt.origin)) return

    let data: unknown = evt.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        // 非 JSON 字符串则忽略
        console.debug('收到消息，非 JSON 字符串')
        return
      }
    }
    if (!data || typeof data !== 'object') {
      console.debug('收到消息，非对象')
      return
    }

    const animationData = data as AnimationCompleteData

    if (animationData.command !== 'play_ani') {
      console.debug('收到消息，不是播放动画的消息')
      return
    }

    console.log('收到播放动画的消息，', animationData)


    if (animationData.status === 'started') {
      console.log('收到播放动画的消息，动画开始')
      return
    }

    if (animationData.status === 'failed') {
      console.error('收到播放动画失败的消息')
      return
    }

    // 约定的完成信号（以下任一字段匹配即可，根据对接情况自行调整）
    const aniData = animationData as AnimationCompleteData
    const isAniComplete = (aniData.status === 'completed')

    if (!isAniComplete) return

    const reqId = animationData.requestId
    const aniName = animationData.ani_name

    if (reqId && pendingRequests.has(reqId)) {
      const pending = pendingRequests.get(reqId)!
      clearTimeout(pending.timeoutId)
      pending.resolve()
      pendingRequests.delete(reqId)
      console.log('✅ Animation completed (by requestId):', { aniName, reqId })
      return
    }

    // 如果对方未返回 requestId，则退而求其次：按 ani_name 匹配最早的待完成请求
    for (const [id, pending] of pendingRequests) {
      if (pending.aniName === aniName) {
        clearTimeout(pending.timeoutId)
        pending.resolve()
        pendingRequests.delete(id)
        console.log('✅ Animation completed (by ani_name):', { aniName })
        break
      }
    }
  }

  // 已移除：handleUnityProgress / handleUnityError

  // Unity 就绪状态监听器
  function handleUnityStatus(event: MessageEvent) {
    // 验证消息来源
    if (!isValidOrigin(event.origin)) {
      console.warn('🚫 Invalid origin for Unity ready message:', event.origin)
      return
    }

    if (event.data?.type === 'unity-ready') {
      const readyData = event.data as UnityReadyData
      const { avatarId } = readyData
      console.log('🎮 Unity WebGL ready for avatar:', avatarId)

      isUnityReady.value = true
      currentAvatarId.value = avatarId
      isLoading.value = false
      loadingProgress.value = 100

      // 处理消息队列
      flushMessageQueue()

      // 触发自定义事件
      window.dispatchEvent(
        new CustomEvent('unity-avatar-ready', {
          detail: { avatarId },
        }),
      )
    }
  }

  // 发送 Unity 就绪消息
  function sendUnityReadyMessage(avatarId: string) {
    window.postMessage(
      {
        type: 'unity-ready',
        avatarId: avatarId,
      },
      window.origin,
    )
  }

  // 清理所有待处理的请求
  function cleanupPendingRequests() {
    for (const [, request] of pendingRequests) {
      clearTimeout(request.timeoutId)
      request.reject(new Error('Unity messaging cleanup'))
    }
    pendingRequests.clear()
  }

  // 重置所有状态
  function resetState() {
    isUnityReady.value = false
    messageQueue.value = []
    currentAvatarId.value = null
    loadError.value = null
    lastError.value = null
    isLoading.value = false
    loadingProgress.value = 0
    playingAnimations.value.clear()
  }

  // 设置消息监听器
  function setupMessageListeners() {
    window.addEventListener('message', handleUnityStatus)
    window.addEventListener('message', handleAnimationDoneMessage)
  }

  // 移除消息监听器
  function removeMessageListeners() {
    window.removeEventListener('message', handleUnityStatus)
    window.removeEventListener('message', handleAnimationDoneMessage)
  }

  return {
    // 状态
    isLoading,
    loadingProgress,
    loadError,
    isUnityReady,
    currentAvatarId,
    lastError,
    playingAnimations,

    // 方法
    playAnimation,
    sendToUnity,
    sendUnityReadyMessage,
    setupMessageListeners,
    removeMessageListeners,
    cleanupPendingRequests,
    resetState
  }
}
