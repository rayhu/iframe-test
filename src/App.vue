<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUnityMessaging } from './composables/useUnityMessaging'
import { animationActions, UNITY_CONFIG } from './data/actions'
import { TARGET_ORIGIN } from './utils/unity'

// 组件相关的 ref
const unityFrame = ref<HTMLIFrameElement | null>(null)
const currentUnityUrl = ref<string>(UNITY_CONFIG.url)

// 使用 Unity 通信 composable
const {
  isUnityReady,
  lastError,
  playingAnimations,
  playAnimation,
  sendUnityReadyMessage,
  setupMessageListeners,
  removeMessageListeners,
  cleanupPendingRequests,
  resetState,
} = useUnityMessaging(unityFrame)

// 简化的动画播放函数
function playAni(aniActualName: string) {
  return playAnimation(aniActualName)
}

// 生命周期管理
onMounted(() => {
  // 设置 Unity 消息监听器
  setupMessageListeners()

  console.log('🎮 UnityModelViewer mounted')

  // 延迟发送Unity提供的示例消息，表示 Unity加载完毕
  // TODO: 以后在Unity方面发送一个加载完毕的消息代替这个调用
  setTimeout(() => {
    try {
      if (unityFrame.value?.contentWindow) {
        // 袋袋加载之后，首个动作是开心打招呼
        const msg = { command: 'play_ani', ani_name: UNITY_CONFIG.initialAnimation }
        unityFrame.value.contentWindow.postMessage(JSON.stringify(msg), TARGET_ORIGIN)
        console.log('Sent test play_ani message to Unity iframe')
        sendUnityReadyMessage(UNITY_CONFIG.defaultAvatarId)
      } else {
        console.warn('Unity iframe contentWindow not available when sending test message')
      }
    } catch (err) {
      console.error('Failed to send test message to Unity iframe:', err)
    }
  }, UNITY_CONFIG.initDelay)
})

onUnmounted(() => {
  // 清理消息监听器
  removeMessageListeners()

  // 清理所有待处理的请求和超时
  cleanupPendingRequests()

  // 重置所有状态
  resetState()

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
  <!-- Error Display -->
  <div v-if="lastError" class="error-message">⚠️ {{ lastError }}</div>

  <div class="actions-toolbar">
    <button
      v-for="action in animationActions"
      :key="action.actualName"
      class="action-btn"
      :class="{
        loading: playingAnimations.has(action.actualName),
        disabled: !isUnityReady,
      }"
      :disabled="!isUnityReady || playingAnimations.has(action.actualName)"
      type="button"
      @click="playAni(action.actualName)"
      :aria-label="`${action.displayName} ${playingAnimations.has(action.actualName) ? '(playing)' : ''}`"
    >
      <span v-if="playingAnimations.has(action.actualName)" class="spinner">⏳</span>
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

<style scoped src="./styles/App.css"></style>
