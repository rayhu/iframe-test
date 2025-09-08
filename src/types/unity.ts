// TypeScript interfaces for Unity integration

export interface UnityMessage {
  command: string
  ani_name: string
  requestId?: string
}

export interface AnimationRequest {
  aniName: string
  resolve: () => void
  reject: (error: unknown) => void
  timeoutId: number
}

export interface QueuedMessage {
  kind: string
  msg: { ani_name: string }
}

export interface UnityReadyData {
  type: 'unity-ready'
  avatarId: string
}



export interface AnimationCompleteData {
  status?: 'completed' | 'started' | 'failed'
  command: 'play_ani'
  requestId?: string
  ani_name: string
}

export interface AnimationAction {
  actualName: string
  displayName: string
}
