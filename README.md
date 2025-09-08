## iframe-test

Simple Vue 3 + Vite app that embeds a Unity WebGL page via iframe and provides quick action buttons to trigger animations through postMessage.

简洁的 Vue 3 + Vite 项目：通过 iframe 嵌入 Unity WebGL 页面，并提供动作按钮，使用 postMessage 触发动画。

### Demo target / 目标页面

- `https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_1` 参考链接：[AI-Chat-Toolkit](https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_1)

## Features / 特性

- Embed external Unity WebGL via iframe
- Action toolbar triggers animations using `postMessage`
- Iframe height capped at 500px; responsive layout
- Minimal code, easy to customize

- 通过 iframe 嵌入外部 Unity WebGL
- 动作按钮通过 `postMessage` 触发动画
- iframe 最大高度 500px，自适应布局
- 代码简洁，易于定制

## Quick start / 快速开始

```sh
yarn        # install deps / 安装依赖
yarn dev    # start dev server / 启动开发服务器
```

Open `http://localhost:5173` in your browser.

浏览器访问 `http://localhost:5173`。

### Env vars / 环境变量

Create a `.env` file (or copy from `.env.example`) and set:

```
VITE_UNITY_TARGET_ORIGIN=https://cdn.fangmiaokeji.cn
```

用于指定向 Unity 发送消息时的目标 Origin。

## Build & preview / 构建与预览

```sh
yarn build   # type-check + build to dist / 类型检查并构建到 dist
yarn preview # local static preview / 本地静态预览
```

## How it works / 工作原理

- The first page embeds the Unity WebGL app in an iframe.
- Each action button sends a JSON string via `window.postMessage` to the iframe’s `contentWindow`.
- The Unity page is expected to handle messages with shape:

```json
{ "command": "play_ani", "ani_name": "idle06_Happy" }
```

- 首页通过 iframe 嵌入 Unity WebGL。
- 每个动作按钮通过 `window.postMessage` 向 iframe 的 `contentWindow` 发送 JSON 字符串。
- Unity 端期望接收如下结构：

```json
{ "command": "play_ani", "ani_name": "idle06_Happy" }
```

### Where to edit / 修改入口

- Iframe URL: `src/App.vue` → the `iframe` `src` attribute
- Actions list: `src/App.vue` → the `actions` array (uses `actualName`)
- Message send: `src/App.vue` → `sendToUnity` / `playAni`

- iframe 地址：`src/App.vue` → `iframe` 的 `src`
- 动作列表：`src/App.vue` → `actions` 数组（使用 `actualName`）
- 发送逻辑：`src/App.vue` → `sendToUnity` / `playAni`

### Security note / 安全提示

For stricter security, consider replacing `'*'` in `postMessage(..., '*')` with the exact origin:

```ts
unityFrame.value?.contentWindow?.postMessage(JSON.stringify(message), 'https://cdn.fangmiaokeji.cn')
```

为更严格的安全性，可将 `postMessage(..., '*')` 的目标改为精确来源：

```ts
unityFrame.value?.contentWindow?.postMessage(JSON.stringify(message), 'https://cdn.fangmiaokeji.cn')
```

## Deploy / 部署

This is a static site (Vite build → `dist`). Any static host works.

项目为纯静态站点（Vite 构建到 `dist`），任意静态托管平台均可。

### Vercel (zero-config) / Vercel（零配置）

```sh
npm i -g vercel
yarn build
vercel --prod   # when asked, set output to "dist"
```

或在 vercel.com 连接 GitHub 仓库 → New Project → Framework: Vite → Output dir: `dist`。

### Cloudflare Pages

- Build command: `yarn build`
- Output directory: `dist`

### Netlify

- Build command: `yarn build`
- Publish directory: `dist`
- Or CLI: `npm i -g netlify-cli && netlify deploy --prod -d dist`

### GitHub Pages

If deploying under `https://<user>.github.io/<repo>`, set `base` in `vite.config.ts` to `'/<repo>/'`, then:

```sh
yarn build
git subtree push --prefix dist origin gh-pages
```

在仓库 Settings → Pages 中启用，Branch 选择 `gh-pages`。

## Docker / 自建服务器部署（Docker）

Multi-stage build with Node 20 and Nginx.

使用多阶段构建（Node 20 + Nginx）。

### Build image / 构建镜像

### Run container / 运行容器

```sh
sudo docker compose up -d --build
```

### Notes / 说明

- The image builds with `yarn build` then serves `/dist` via Nginx.
- For custom domains and HTTPS, place behind a reverse proxy (e.g., Caddy/Traefik/Nginx) or terminate TLS at a load balancer.
- If your server cannot access public registries, pre-build and push to a private registry.

## Scripts / 脚本

```json
{
  "dev": "vite",
  "build": "run-p type-check \"build-only {@}\" --",
  "preview": "vite preview",
  "type-check": "vue-tsc --build",
  "lint": "eslint . --fix",
  "format": "prettier --write src/",
  "test": "vitest",
  "test:run": "vitest run",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage"
}
```

## Testing / 测试

项目使用 [Vitest](https://vitest.dev/) 作为测试框架，提供完整的单元测试覆盖。

### 运行测试

```bash
# 运行所有测试
yarn test

# 运行测试一次（CI 模式）
yarn test:run

# 启动测试 UI 界面
yarn test:ui

# 运行测试并生成覆盖率报告
yarn test:coverage
```

### 测试文件结构

```
src/
├── composables/
│   ├── __tests__/
│   │   └── useUnityMessaging.test.ts    # Unity 通信 composable 测试
│   └── useUnityMessaging.ts
├── utils/
│   ├── __tests__/
│   │   └── unity.test.ts                # 工具函数测试
│   └── unity.ts
└── tests/
    └── setup.ts                         # 测试环境配置
```

### 测试覆盖范围

- **useUnityMessaging composable**: 16 个测试
  - 状态管理
  - Unity 消息发送和接收
  - 动画播放控制
  - 错误处理和超时
  - 事件监听器管理
- **工具函数**: 8 个测试
  - 请求 ID 生成
  - 来源验证
  - 常量验证

## Recommended IDE / 推荐 IDE

- VSCode + Volar (disable Vetur)
