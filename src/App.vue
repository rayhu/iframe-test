<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const unityFrame = ref<HTMLIFrameElement | null>(null)
// 消息队列 - 在 Unity 未就绪时缓存消息
const messageQueue = ref<Array<{ kind: string; msg: any }>>([])

// 状态管理
const isLoading = ref(false)
const loadingProgress = ref(0)
const loadError = ref<string | null>(null)
const isUnityReady = ref(false)
const currentAvatarId = ref<string | null>(null)
const currentUnityUrl = ref<string>('https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2')

// 硬编码按钮动作（使用 actualName 作为 ani_name）
const actions = [
  { actualName: 'idle01_BaoQianNuLi', displayName: '抱歉但努力' },
  { actualName: 'idle02_Love', displayName: '表达爱意' },
  { actualName: 'idle03_DaXiao', displayName: '大笑' },
  { actualName: 'idle04_TiaoPi', displayName: '调皮' },
  { actualName: 'idle05_Sorry', displayName: '鞠躬致谢（再见）' },
  { actualName: 'idle06_Happy', displayName: '开心打招呼' },
  { actualName: 'idle07_Smile', displayName: '微笑' },
  { actualName: 'J00', displayName: '普通讲解模式' },
  { actualName: 'J01_Daoqian', displayName: '（讲解）道歉安抚' },
  { actualName: 'J02_Duibi', displayName: '（讲解）对比分析' },
  { actualName: 'J03_Juli', displayName: '（讲解）举例说明' },
  { actualName: 'J04_Qiangdiao', displayName: '（讲解）强调重点' },
  { actualName: 'J05_Zhixiang', displayName: '（讲解）指向重点' },
  { actualName: 'ZZ_mode', displayName: '专注模式' },
]

// 发送消息到 Unity
function sendToUnity(kind: string, msg: any) {
  if (!unityFrame.value?.contentWindow) {
    console.error('❌ Unity iframe not available')
    return
  }

  const message = { command: 'play_ani', ani_name: msg.ani_name }

  try {
    unityFrame.value.contentWindow.postMessage(JSON.stringify(message), '*')
    console.log('📤 Sent to Unity:', message)
  } catch (error) {
    console.error('❌ Failed to send message to Unity:', error)
  }
}

function playAni(aniActualName: string) {
  sendToUnity('play_ani', { ani_name: aniActualName })
}

function sendUnityReadyMessage(avatarId: string) {
  window.postMessage(
    {
      type: 'unity-ready',
      avatarId: avatarId,
    },
    window.origin, // 或者 '*'
  )
}

// 处理消息队列
function flushMessageQueue() {
  if (messageQueue.value.length === 0) return

  console.log(`📤 Flushing ${messageQueue.value.length} queued messages to Unity`)

  messageQueue.value.forEach(({ kind, msg }) => {
    sendToUnity(kind, msg)
  })

  messageQueue.value = []
}
// 验证消息来源
function isValidOrigin(origin: string): boolean {
  // 在开发环境允许本地源
  const allowedOrigins = [
    window.location.origin,
    // TODO: 以后需要删除这个
    'http://localhost:5173',
    'http://localhost:3000',
  ]
  return allowedOrigins.includes(origin)
}

// Unity 进度更新监听器
function handleUnityProgress(event: MessageEvent) {
  if (!isValidOrigin(event.origin)) return

  if (event.data?.type === 'unity-progress') {
    const { progress } = event.data
    loadingProgress.value = Math.round(progress * 100)
  }
}

// Unity 错误监听器
function handleUnityError(event: MessageEvent) {
  if (!isValidOrigin(event.origin)) return

  if (event.data?.type === 'unity-error') {
    const { message } = event.data
    console.error('❌ Unity WebGL error:', message)
    loadError.value = message
    isLoading.value = false
  }
}

// Unity 就绪状态监听器
function handleUnityReady(event: MessageEvent) {
  // 验证消息来源
  if (!isValidOrigin(event.origin)) {
    console.warn('🚫 Invalid origin for Unity ready message:', event.origin)
    return
  }

  if (event.data?.type === 'unity-ready') {
    const { avatarId } = event.data
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

// 生命周期管理
onMounted(() => {
  // 注册 Unity 消息监听器
  window.addEventListener('message', handleUnityReady)
  window.addEventListener('message', handleUnityProgress)
  window.addEventListener('message', handleUnityError)

  // 处理窗口大小变化
  // window.addEventListener('resize', handleResize)

  console.log('🎮 UnityModelViewer mounted')

  // 延迟 3 秒发送Unity提供的示例消息，表示Unity加载完毕
  // TODO: 以后在Unity方面发送一个加载完毕的消息代替这个调用
  setTimeout(() => {
    try {
      if (unityFrame.value?.contentWindow) {
        // 袋袋加载之后，首个动作是开心打招呼
        const msg = { command: 'play_ani', ani_name: 'idle06_Happy' }
        unityFrame.value.contentWindow.postMessage(JSON.stringify(msg), '*')
        console.log('Sent test play_ani message to Unity iframe')
        sendUnityReadyMessage('daidai_01')
      } else {
        console.warn('Unity iframe contentWindow not available when sending test message')
      }
    } catch (err) {
      console.error('Failed to send test message to Unity iframe:', err)
    }
  }, 3000)
})

onUnmounted(() => {
  // 清理消息监听器
  window.removeEventListener('message', handleUnityReady)
  window.removeEventListener('message', handleUnityProgress)
  window.removeEventListener('message', handleUnityError)
  // window.removeEventListener('resize', handleResize)

  // 清理状态
  isUnityReady.value = false
  messageQueue.value = []

  console.log('🧹 UnityModelViewer unmounted')
})
</script>

<template>
  <!--       src="https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2"  -->
  <div class="unity-iframe-container">
    <iframe
      :src="currentUnityUrl"
      title="AI-Chat-Toolkit"
      ref="unityFrame"
      class="unity-iframe"
      referrerpolicy="no-referrer"
      loading="eager"
    ></iframe>
  </div>
  <div class="actions-toolbar">
    <button
      v-for="action in actions"
      :key="action.actualName"
      class="action-btn"
      type="button"
      @click="playAni(action.actualName)"
    >
      {{ action.displayName }}
    </button>
  </div>
  <div class="repo-link">
    <div class="repo-card">
      <div class="repo-title">源代码</div>
      <a
        class="repo-btn"
        href="https://github.com/rayhu/iframe-test"
        target="_blank"
        rel="noopener"
      >
        <svg class="repo-icon" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
        <span>rayhu/iframe-test</span>
      </a>
      <div class="repo-sub">这个地址下可以找到源代码</div>
    </div>
  </div>
</template>

<style scoped>
.unity-iframe-container {
  width: 100%;
  height: min(500px, 100vh);
  margin-bottom: 32px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.unity-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  display: block;
  position: relative;
  z-index: 1;
}
.actions-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.action-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  cursor: pointer;
}
.action-btn:hover {
  background: #f5f7fa;
}
.repo-link {
  margin-top: 56px;
  display: flex;
  justify-content: center;
}
.repo-card {
  padding: 16px 20px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
}
.repo-title {
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}
.repo-sub {
  color: #6b7280;
  font-size: 12px;
  margin-top: 6px;
}
.repo-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: #ffffff;
  background: #111827;
  border: 1px solid #111827;
}
.repo-btn:hover {
  background: #1f2937;
}
.repo-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
@media (max-width: 480px) {
  .unity-iframe-container {
    width: 300px;
    height: 300px;
    margin: 0 auto 32px;
  }
}
</style>
