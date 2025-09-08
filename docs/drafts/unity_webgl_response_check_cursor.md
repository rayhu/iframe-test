# Unity WebGL 静态资源压缩与响应头体检报告（CDN: cdn.fangmiaokeji.cn）

> 页面入口：`https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2`  
> 构建产物：`.js.unityweb` / `.wasm.unityweb` / `.data.unityweb`

---

## 结论（TL;DR）

- 三类构建产物（`.js/.wasm/.data.unityweb`）均缺少 `Content-Encoding: br` 且 `Content-Type` 为非标准 `application/vnd.unity`。
- 浏览器无法原生解压（需走 JS Fallback）→ 传输与解压成本升高，首屏变慢。
- 首页 `index.html` 使用超长缓存（1 年），不利于热更新；建议缩短或使用 `no-cache`。
- 预计修正后：传输体积下降 **30–50%**，Wi‑Fi/4G 环境首帧缩短至 **5–8s**，低端机掉帧风险下降。

---

## 1. 已观测问题

### 样本 URL

- JS：`/Build/8b217b6473148ec1ab79748d6d795fb5.js.unityweb`
- WASM：`/Build/8b93851e99767d19f980a9dab8b5d2e1.wasm.unityweb`
- DATA：`/Build/c13372dc2832cdf55919bc3352890c0d.data.unityweb`

### 抓包结果（index.html）

```http
HTTP/1.1 200 OK
Content-Type: text/html
Cache-Control: public, max-age=31536000        ← 首页缓存 1 年（不推荐）
Vary: Accept-Encoding
```

### 抓包结果（js.unityweb）

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.unity             ← 非标准，应为 application/javascript
Content-Encoding: (缺失)                        ← 期望为 br
Cache-Control: public, max-age=31536000
Content-Length: 86685
```

### 抓包结果（wasm.unityweb）

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.unity             ← 非标准，应为 application/wasm
Content-Encoding: (缺失)                        ← 期望为 br
Cache-Control: public, max-age=31536000
Content-Length: 7500069                         ← ~7.15 MiB（未标注 br）
```

### 抓包结果（data.unityweb）

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.unity             ← 非标准，应为 application/octet-stream
Content-Length: 29194904                        ← ~27.8 MiB（未标注 br）
Content-Encoding: (缺失)                        ← 期望为 br
Cache-Control: public, max-age=31536000
```

---

## 2. 正确的响应头规范

### `.wasm.unityweb`

```http
Content-Type: application/wasm
Content-Encoding: br
Cache-Control: public, max-age=31536000, immutable
Vary: Accept-Encoding
```

### `.data.unityweb` / `.bundle`

```http
Content-Type: application/octet-stream
Content-Encoding: br
Cache-Control: public, max-age=31536000, immutable
Vary: Accept-Encoding
```

### `.js.unityweb`

```http
Content-Type: application/javascript
Content-Encoding: br
Cache-Control: public, max-age=31536000, immutable
Vary: Accept-Encoding
```

### `index.html`

```http
Content-Type: text/html; charset=utf-8
Cache-Control: no-cache, no-store, must-revalidate   # 或 max-age=60 之类的短缓存
Vary: Accept-Encoding
```

---

## 3. 配置建议

### 七牛（Qiniu）存储/CDN

- 对象存储元数据或 CDN 响应头覆盖，按后缀统一设置：
  - `.wasm.unityweb` → `Content-Type: application/wasm`，`Content-Encoding: br`
  - `.data.unityweb` → `Content-Type: application/octet-stream`，`Content-Encoding: br`
  - `.js.unityweb` → `Content-Type: application/javascript`，`Content-Encoding: br`
- 关闭 CDN 的二次压缩（避免双重压缩），仅透传 `Content-Encoding: br`。
- 增加 `Vary: Accept-Encoding`，并设置 `Cache-Control: public, max-age=31536000, immutable`。
- 首页 `index.html` 单独策略：`no-cache` 或短 `max-age`（例如 60–300 秒）。

### Nginx 网关规则（示例）

```nginx
location ~* \.wasm(\.unityweb)?$ {
  add_header Content-Type application/wasm always;
  add_header Content-Encoding br always;
}
location ~* \.(data|bundle)\.unityweb$ {
  add_header Content-Type application/octet-stream always;
  add_header Content-Encoding br always;
}
location ~* \.js\.unityweb$ {
  add_header Content-Type application/javascript always;
  add_header Content-Encoding br always;
}
add_header Cache-Control "public, max-age=31536000, immutable" always;
add_header Vary "Accept-Encoding" always;

# 首页建议单独 location（可选）
location = /daizi/v2.2/index.html {
  add_header Cache-Control "no-cache, no-store, must-revalidate" always;
}
```

---

## 4. 性能收益预期

| 改动                          | 收益                                |
| ----------------------------- | ----------------------------------- |
| 正确回 `Content-Encoding: br` | 传输体积下降 **30–50%**             |
| 修正 `Content-Type`           | 避免浏览器兼容性问题                |
| `Vary: Accept-Encoding`       | 提升 CDN 缓存命中率                 |
| 分包 + KTX2 压缩              | 首屏资源减少 **30–60%**             |
| 构建/渲染优化                 | 首帧 ≤ **5–8s**，移动端 ≥ **30fps** |

---

## 5. 验收清单

- [ ] `.js/.wasm/.data.unityweb` 均返回 `Content-Encoding: br`
- [ ] MIME 类型分别为 `javascript` / `wasm` / `octet-stream`
- [ ] 长缓存 & `Vary: Accept-Encoding`
- [ ] 浏览器 Network 面板中 `Transferred << Content`
- [ ] 实测设备首帧 ≤ 8s，帧率达标
