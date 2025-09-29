import type { AnimationAction } from '../types/unity'

// 硬编码按钮动作（使用 actualName 作为 ani_name）
export const animationActions: AnimationAction[] = [
  { actualName: 'idle01_BaoQianNuLi', displayName: '抱歉但努力' },
  { actualName: 'idle02_Love', displayName: '表达爱意' },
  { actualName: 'idle03_DaXiao', displayName: '大笑' },
  { actualName: 'idle04_TiaoPi', displayName: '调皮' },
  { actualName: 'idle05_Sorry', displayName: '鞠躬致谢（再见）' },
  { actualName: 'idle06_Happy', displayName: '开心打招呼' },
  { actualName: 'idle07_Smile', displayName: '微笑' },
  { actualName: 'JJ00', displayName: '普通讲解模式' },
  { actualName: 'JJ01_Daoqian', displayName: '（讲解）道歉安抚' },
  { actualName: 'JJ02_Duibi', displayName: '（讲解）对比分析' },
  { actualName: 'JJ03_Juli', displayName: '（讲解）举例说明' },
  { actualName: 'JJ04_Qiangdiao', displayName: '（讲解）强调重点' },
  { actualName: 'JJ05_Zhixiang', displayName: '（讲解）指向重点' },
  { actualName: 'ZZ_mode', displayName: '专注模式' },
]

// Unity iframe 配置
// http://localhost:8000/index.html?cc=daidai_2

export const UNITY_CONFIG = {
  url: 'http://localhost:8000/index.html?cc=daidai_2',
  //   url: 'https://cdn.fangmiaokeji.cn/daizi/v2.7/index.html?cc=daidai_2',
  defaultAvatarId: 'daidai_02',
  initialAnimation: 'idle06_Happy',
  initDelay: 10000, // 3秒延迟发送初始消息
}
