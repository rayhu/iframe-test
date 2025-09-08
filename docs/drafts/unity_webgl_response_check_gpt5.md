
# Unity WebGL 静态资源压缩与响应头体检报告（CDN: cdn.fangmiaokeji.cn）

> 页面入口：`https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2`  
> 构建产物：`.js.unityweb` / `.wasm.unityweb` / `.data.unityweb`

---

## 结论（TL;DR）

- `.data.unityweb` 响应头缺少 `Content-Encoding: br`，`Content-Type` 为非标准的 `application/vnd.unity`。
- 浏览器无法原生解压 Brotli → 下载体积更大、CPU 占用更高、首屏更慢。
- 预计修正后：传输体积下降 **30–50%**，Wi‑Fi/4G 环境首帧缩短至 **5–8s**，低端机掉帧风险下降。

---

## 1. 已观测问题

### 样本 URL
- JS：`/Build/8b217b6473148ec1ab79748d6d795fb5.js.unityweb`
- WASM：`/Build/8b93851e99767d19f980a9dab8b5d2e1.wasm.unityweb`
- DATA：`/Build/c13372dc2832cdf55919bc3352890c0d.data.unityweb`

### 抓包结果（data.unityweb）
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.unity      ← 非标准
Content-Length: 29194904                 ← ~27.8 MiB
Content-Encoding: (缺失)                  ← 期望为 br
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

---

## 3. 配置建议

### 七牛（Qiniu）存储/CDN
- 按后缀统一设置：
  - `.wasm.unityweb` → `application/wasm; br`
  - `.data.unityweb` → `application/octet-stream; br`
  - `.js.unityweb` → `application/javascript; br`
- 关闭二次压缩，仅标记 `Content-Encoding: br`。
- 增加 `Vary: Accept-Encoding`。

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
```

---

## 4. 性能收益预期

| 改动 | 收益 |
|------|------|
| 正确回 `Content-Encoding: br` | 传输体积下降 **30–50%** |
| 修正 `Content-Type` | 避免浏览器兼容性问题 |
| `Vary: Accept-Encoding` | 提升 CDN 缓存命中率 |
| 分包 + KTX2 压缩 | 首屏资源减少 **30–60%** |
| 构建/渲染优化 | 首帧 ≤ **5–8s**，移动端 ≥ **30fps** |

---

## 5. 验收清单

- [ ] `.js/.wasm/.data.unityweb` 均返回 `Content-Encoding: br`
- [ ] MIME 类型分别为 `javascript` / `wasm` / `octet-stream`
- [ ] 长缓存 & `Vary: Accept-Encoding`
- [ ] 浏览器 Network 面板中 `Transferred << Content`
- [ ] 实测设备首帧 ≤ 8s，帧率达标
