# Unity WebGL 静态资源压缩与响应头体检报告（最终定稿版）

> 页面入口：`https://cdn.fangmiaokeji.cn/daizi/v2.2/index.html?cc=daidai_2`  
> 构建产物：`.js.unityweb` / `.wasm.unityweb` / `.data.unityweb`  
> 目标：检查 CDN 响应是否符合最佳实践，提出修正方案，预估性能收益。  

---

## 一、结论概览（TL;DR）

- **发现的问题**  
  - `.unityweb` 文件缺少 `Content-Encoding: br`，浏览器无法原生 Brotli 解压；  
  - `Content-Type` 使用了非标准值（如 `application/vnd.unity`）；  
  - 缺少 `Vary: Accept-Encoding`，影响 CDN 缓存命中率。  

- **主要后果**  
  - 下载体积更大（传输无压缩收益）；  
  - CPU 占用更高（Unity Loader 走 JS 解压慢路径）；  
  - 首屏加载更慢（10–15 秒甚至更长）；  
  - 移动端弱网体验差，低端机掉帧风险更高。  

- **修正措施**  
  - 为 `.unityweb` 文件设置正确 MIME 与 `Content-Encoding: br`；  
  - 增加 `Cache-Control: public, max-age=31536000, immutable` 与 `Vary: Accept-Encoding`；  
  - 禁止二次压缩（Unity 已预压缩）。  

- **预期收益**  
  - **传输体积下降 30–50%**；  
  - **首屏加载缩短 30–50%**：从 10–15 秒 → 5–8 秒；  
  - **低端机更流畅**：CPU 占用下降，掉帧明显减少。  

---

## 二、已观测问题

### 样本 URL
- JS：`/Build/8b217b6473148ec1ab79748d6d795fb5.js.unityweb`  
- WASM：`/Build/8b93851e99767d19f980a9dab8b5d2e1.wasm.unityweb`  
- DATA：`/Build/c13372dc2832cdf55919bc3352890c0d.data.unityweb`

### 抓包结果（data.unityweb）
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.unity      ← 非标准
Content-Length: 29194904                 ← ~27.8 MiB
Content-Encoding: (缺失)                  ← 应为 br
Cache-Control: public, max-age=31536000
```

判定：  
- `.unityweb` 文件已被 Unity 预压缩为 Brotli，但服务器未返回 `Content-Encoding: br`，浏览器无法原生解压；  
- MIME 类型错误，可能导致浏览器走兼容/慢速路径。  

---

## 三、正确的响应头规范

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

## 四、配置方案

### A. 七牛（Qiniu）存储/CDN
- 按文件后缀设置响应头：  
  - `.wasm.unityweb` → `application/wasm; br`  
  - `.data.unityweb` → `application/octet-stream; br`  
  - `.js.unityweb` → `application/javascript; br`  
- 禁止二次压缩，仅标注 `Content-Encoding: br`；  
- 增加 `Vary: Accept-Encoding`。  

### B. Nginx 网关规则示例
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

## 五、验收与测试方法

### cURL 验证
```bash
# JS
curl -s -D - -o /dev/null -H 'Cache-Control: no-cache' -H 'Accept-Encoding: br,gzip'   'https://cdn.fangmiaokeji.cn/daizi/v2.2/Build/8b217b6473148ec1ab79748d6d795fb5.js.unityweb?bust=1'

# WASM
curl -s -D - -o /dev/null -H 'Cache-Control: no-cache' -H 'Accept-Encoding: br,gzip'   'https://cdn.fangmiaokeji.cn/daizi/v2.2/Build/8b93851e99767d19f980a9dab8b5d2e1.wasm.unityweb?bust=1'

# DATA
curl -s -D - -o /dev/null -H 'Cache-Control: no-cache' -H 'Accept-Encoding: br,gzip'   'https://cdn.fangmiaokeji.cn/daizi/v2.2/Build/c13372dc2832cdf55919bc3352890c0d.data.unityweb?bust=1'
```

**检查点：**
- `Content-Encoding: br` 是否存在；  
- MIME 是否标准；  
- 浏览器 DevTools Network：Transferred 明显小于 Content；  
- 无 MIME/解压相关报错；  
- 实测设备首帧 ≤ 8 秒。  

---

## 六、进一步优化方向

- **资源分包（Addressables）**：首屏仅加载核心资源，其余延迟加载；  
- **贴图压缩（KTX2/BasisU）**：含透明通道，纹理体积下降 40–70%；  
- **模型与动画**：合理 LOD、合并小网格、清理未用曲线与骨骼；  
- **构建优化**：IL2CPP、Managed Stripping（Medium/High）、URP Mobile、关闭多余后处理；  
- **Web 优化**：iframe 懒加载，录制时才启用 `preserveDrawingBuffer`。  

目标：  
- 首屏下载总量 **10–20 MB**；  
- 首帧时间（Wi-Fi，近三年机型） **≤ 5–8 秒**；  
- 移动端 ≥ 30fps，桌面 ≥ 60fps。  

---

## 七、性能收益预期

| 改动 | 收益 |
|------|------|
| `Content-Encoding: br` | 传输体积下降 **30–50%**，CPU 解压负担下降 |
| 修正 MIME 类型 | 避免浏览器兼容性降级 |
| `Vary: Accept-Encoding` | 提升 CDN 缓存命中率 |
| 资源分包 | 首屏下载减少 **30–60%** |
| 贴图压缩 (KTX2/BasisU) | 纹理体积减少 **40–70%** |
| 构建优化 | 帧率稳定，弱机不卡顿 |

---

## 八、验收清单

- [ ] `.js/.wasm/.data.unityweb` 均返回 `Content-Encoding: br`  
- [ ] MIME 类型正确（javascript / wasm / octet-stream）  
- [ ] `Cache-Control` 长缓存 & `Vary: Accept-Encoding` 正确返回  
- [ ] DevTools 中 `Transferred << Content`  
- [ ] 实机测试：移动端首帧 ≤ 8 秒，帧率达标  

---

✅ **最终建议**  
只需在 CDN/网关修正响应头，即可立即获得 **30–50% 的体积缩减与首屏加速**；配合分包与贴图压缩，首屏体积可降至 **10–20 MB**，首帧时间 **5–8 秒**可达。  
