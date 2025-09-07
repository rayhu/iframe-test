<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref } from 'vue'

const unityFrame = ref<HTMLIFrameElement | null>(null)

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
</script>

<template>
  <div class="unity-iframe-container">
    <iframe
      src="https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_1"
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
</style>
