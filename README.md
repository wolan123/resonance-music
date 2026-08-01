# LUMEN 流光音乐 · Shared Music Site

一个真正的共享音乐网站：注册账号上传歌曲，所有人都能在音乐大厅听到。播放时有 QQ 音乐动感模式那种沉浸光效，歌词自动联网匹配。

线上地址：https://resonance-music-wolan123s-projects.vercel.app

备用地址：https://lumen-radio.vercel.app

## 功能

- **账号体系**：用户名 + 密码注册/登录（scrypt 加盐哈希 + AES-256-GCM 加密存储），上传的歌署上你的名字，只有本人能删除
- **共享音乐大厅**：所有用户上传的歌曲集中展示，人人可听（歌曲和封面存储在 Vercel Blob 公共存储）
- **上传**：拖拽/选择音频文件，自动读取标题、歌手、专辑、封面、时长；可附带 `.lrc` 歌词
- **播放特效（QQ 音乐动感风格）**：动感（炫彩频谱 + 旋转光轮）、极光、脉冲三种模式，低音节拍检测驱动光环扩散，可一键开关
- **歌词**：随播放同步滚动高亮，点击歌词跳转；播放时自动联网匹配歌词（lrclib，服务端匹配并保存，大家都能用）
- **收藏**：本地收藏夹
- **响应式**：桌面 / 移动端都可用

## 技术架构

- 前端：React 19 + Vite + Tailwind CSS v4 + Framer Motion
- 存储：Vercel Blob（浏览器直传，绕过函数 4.5MB 体积限制；每首歌一个 JSON 索引文件，天然避免并发覆盖）
- API：Vercel Serverless Functions（`api/upload.js` 签发客户端上传令牌，`api/tracks.js` 管理歌曲列表）
- 元数据解析：`music-metadata`（浏览器端读取 ID3/FLAC/MP4 标签与内嵌封面）

## 本地运行

```bash
npm install
npm run dev
```

注意：本地开发时 API 需要 Vercel 环境（`vercel dev` 或直接部署后访问线上）。

## 说明

- 免费额度：Vercel Blob Hobby 计划约 1GB 存储。上传前请只选择你拥有版权的音乐。
- 删除歌曲会同时删除音频与封面文件。
- 版权归原作者所有。
