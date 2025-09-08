# Unity WebGL 对接规范（中文）

本文档定义前端（Vue 宿主页面）与 Unity WebGL（iframe 内）之间基于 `postMessage` 的通信协议，明确消息格式、收发方向、时序与安全策略。

## 1. 目标与范围

- 通过 `window.postMessage` 在父页面与 Unity iframe 之间进行消息通信。
- 控制 Unity 动画播放，并在动画完成后回调父页面。
- 在 Unity 加载完毕时向父页面发送“就绪”消息。

## 2. 通信通道（Channels）

- 父页面 → Unity（宿主 → iframe）：发送指令，例如“播放动画”。
- Unity → 父页面（iframe → 宿主）：发送加载就绪、动画生命周期事件（开始/完成/失败）。

## 3. 安全与来源（Security & Origins）

- 生产建议：父页面发送消息时应使用精确 `targetOrigin`，默认值为 `https://cdn.fangmiaokeji.cn`。
- 可配置：`TARGET_ORIGIN` 从环境变量 `VITE_UNITY_TARGET_ORIGIN` 读取（无配置则回退到 `https://cdn.fangmiaokeji.cn`）。
- 开发放松：代码中 `isValidOrigin` 允许以下来源——
  - `window.location.origin`
  - `http://localhost:5173`
  - `http://localhost:3000`
  - `TARGET_ORIGIN`
- 父页面在接收 Unity 的动画完成消息时，会允许来源为 `TARGET_ORIGIN` 或通过 `isValidOrigin` 判定为合法的来源。

> 配置位置：
>
> - `src/utils/unity.ts` 暴露 `TARGET_ORIGIN` 与 `isValidOrigin`
> - 通过 `.env` 设置 `VITE_UNITY_TARGET_ORIGIN`

## 4. 父页面 → Unity：播放动画（play_ani）

- 指令：`command: "play_ani"`
- 字段：
  - `command` (string) 固定值 `"play_ani"`
  - `ani_name` (string) 约定的动画标识（例如 `idle06_Happy`）
  - `requestId` (string) 唯一请求 ID，Unity 在回包中需原样返回
- 示例（父页面发送）：

```json
{
  "command": "play_ani",
  "ani_name": "idle06_Happy",
  "requestId": "1700000000000-ab12cd"
}
```

- 发送方式（父页面）：

```javascript
iframe.contentWindow.postMessage(JSON.stringify(payload), TARGET_ORIGIN)
```

## 5. Unity → 父页面：动画生命周期（Lifecycle）

Unity 端可按以下阶段回报（至少需要回报 `completed` 或 `failed`）。

- 动画开始（可选）：

```json
{
  "command": "play_ani",
  "status": "started",
  "requestId": "1700000000000-ab12cd",
  "ani_name": "idle06_Happy"
}
```

- 动画完成（必需其一）：

```json
{
  "command": "play_ani",
  "status": "completed",
  "requestId": "1700000000000-ab12cd",
  "ani_name": "idle06_Happy"
}
```

- 动画失败（可选，如果失败）：

```json
{
  "command": "play_ani",
  "status": "failed",
  "requestId": "1700000000000-ab12cd",
  "ani_name": "idle06_Happy",
  "message": "可选：失败原因"
}
```

- 发送方式（Unity → 父页面）：

```javascript
window.parent.postMessage(JSON.stringify(payload), window.parent.origin)
```

> 注意：
>
> - 回包必须携带与请求一致的 `requestId` 与 `ani_name`，以便父页面正确匹配。
> - 若不返回 `requestId`，父页面会回退按 `ani_name` 匹配最早的待完成请求（不推荐）。

## 6. Unity → 父页面：加载就绪（Ready）

- 类型：`type: "unity-ready"`
- 字段：
  - `type` (string) 固定值 `"unity-ready"`
  - `avatarId` (string) 当前加载的角色/形象 ID（例如 `daidai_01`）
- 示例：

```json
{
  "type": "unity-ready",
  "avatarId": "daidai_01"
}
```

- 发送方式（Unity → 父页面）：

```javascript
window.parent.postMessage({ type: 'unity-ready', avatarId: 'daidai_01' }, window.parent.origin)
```

## 7. 超时策略（Timeout）

- 父页面在发送 `play_ani` 后会等待动画完成消息。
- 超时时间为 15 秒；超时未完成则视为失败并拒绝对应的 Promise。

## 8. 并发与去重（Concurrency & Dedup）

- 父页面会阻止相同 `ani_name` 在同一时刻的重复触发（`playingAnimations` 去重）。
- 仍支持并发请求：若不同动画并行，或同一动画使用不同 `requestId`，应分别回包。
- 父页面使用 `pendingRequests: Map<requestId, resolve/reject>` 跟踪待完成请求。

## 9. 错误与日志（Errors & Logging）

- Unity 若发生错误，应发送 `status: "failed"` 并可选携带 `message` 字段说明原因。
- 父页面会记录关键日志（消息发送、动画完成、错误信息）用于排查问题。

## 10. 配置项（Configuration）

- 必需/已支持：
  - `VITE_UNITY_TARGET_ORIGIN`：父页面 `postMessage` 的目标 Origin（默认 `https://cdn.fangmiaokeji.cn`）
- 可选/建议（如需更加灵活）：
  - `VITE_UNITY_IFRAME_URL`：Unity iframe 的加载地址（当前在 `src/data/actions.ts` 中配置）
  - `VITE_UNITY_DEFAULT_AVATAR_ID`：默认 avatarId（用于发送就绪示例）
  - `VITE_UNITY_INITIAL_ANIMATION`：初始化时的演示动画名
  - `VITE_UNITY_INIT_DELAY_MS`：初始化延迟（毫秒）

## 11. 测试与调试（Testing & Debugging）

- 浏览器控制台模拟 Unity → 父页面：

```javascript
// 模拟动画完成
window.dispatchEvent(
  new MessageEvent('message', {
    origin: window.location.origin,
    data: {
      command: 'play_ani',
      status: 'completed',
      requestId: 'demo-123',
      ani_name: 'idle06_Happy',
    },
  }),
)

// 模拟Unity就绪
window.dispatchEvent(
  new MessageEvent('message', {
    origin: window.location.origin,
    data: { type: 'unity-ready', avatarId: 'daidai_01' },
  }),
)
```

## 12. 版本与扩展（Versioning & Extensibility）

- 预留可选字段：`protocolVersion`（默认 `1.0`）。
- 可按需扩展诊断字段（如 `durationMs`），父页面未依赖则可安全忽略。

---

如需对协议进行扩展或变更，请与前端保持一致更新，并在提交说明中同步记录。若你希望我将上述“可选配置”落地为 `.env` 与代码读取逻辑，我可以在不破坏现有功能的前提下逐步增加（保持默认值作为回退）。
