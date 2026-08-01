# 共鸣 · Resonance

一个可直接使用的在线音乐网站：搜索歌曲、30 秒试听、收藏喜欢的音乐。数据与试听片段来自 Apple 公开音乐接口（iTunes Search / RSS），版权归原作者所有。

线上地址：[resonance-music-ten.vercel.app](https://resonance-music-ten.vercel.app)

## 功能

- 搜索歌曲、歌手、专辑（iTunes Search）
- 今日热门推荐（iTunes 全球榜单，失败时自动切换到多品类搜索）
- 底部常驻播放器：播放/暂停、上一首/下一首、进度拖动、音量控制、空格键快捷播放
- 收藏夹本地持久化（localStorage）
- 移动端 / 桌面端响应式布局，深色暖橙主题

## 本地运行

```bash
npm install
npm run dev
```

构建：

```bash
npm run build
npm run preview
```

## 部署

纯静态站点，可直接部署到 Vercel、Netlify 或 GitHub Pages：

```bash
vercel --prod
```
