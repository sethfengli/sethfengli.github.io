# 部署到 GitHub Pages（完整步骤）

目标地址：**https://sethfengli.github.io/**（用户根站点，仓库名必须为 `sethfengli.github.io`）。

## 1. 本地准备

```bash
git init
git remote add origin https://github.com/sethfengli/sethfengli.github.io.git
npm install
npm run build          # 产出 dist/
```

## 2. 推送到 GitHub

```bash
git add .
git commit -m "慧灯禅院：重构自如说修行网上佛学院"
git branch -M main
git push -u origin main
```

## 3. 开启 Pages（一次性设置）

1. 打开仓库 **Settings → Pages**；
2. **Source** 选择 **GitHub Actions**（本项目用 actions/deploy-pages，**不要**选分支模式）；
3. 保存即可。

## 4. 自动构建部署

`.github/workflows/deploy.yml` 已配置：
- 推送到 `main` 自动触发；也可在 **Actions → Deploy to GitHub Pages → Run workflow** 手动触发；
- 构建（Node 22 → `npm ci` → `npm run build`）→ 上传 Pages 工件 → `actions/deploy-pages@v4` 发布；
- 完成后访问 https://sethfengli.github.io/ 验证。

## 5. 干净 URL 与刷新不 404 的保证

- 路由使用 **BrowserRouter**：地址形如 `https://sethfengli.github.io/articles/301jgj`，无 `#`；
- `vite.config.ts` 设 `base: '/'`；构建后自动把 `dist/index.html` 复制为 `dist/404.html`
  （`spa-404-fallback` 插件）。GitHub Pages 对未知路径会回退渲染 `404.html`，
  SPA 随即按 `location.pathname` 恢复路由——刷新/直达深链不 404；
- 若要部署到项目子路径（`user.github.io/repo/`），需把 `base` 改为 `'/<repo>/'`
  并给路由加对应 `basename`。

## 6. 验证清单

- [ ] 首页 Hero、四张导览卡、精选经论正常显示，香炉可点燃
- [ ] 打开一篇文章：目录跳转、字号/行距/5 种背景切换并刷新后仍记忆
- [ ] 撞钟出声（真实梵钟录音 + Web Audio 合成兜底），圣号梵音可播放、计数可持久化
- [ ] 祈福：提交 → 心愿化作红绸飘带挂上古树；点击飘带可查看/删除；导出 JSON → 清空 → 导入恢复
- [ ] 灵签：观音像与朱漆签筒 → 摇签 → 翻牌 → 收藏 → 历史可查
- [ ] 右上角 EN 切换全站 UI；头部调色按钮可切换 4 套佛教配色主题；阅读器“翻译本文”可加载 Google 翻译
- [ ] 手机宽度下导航折叠、目录抽屉、表格横向滚动正常

## 7. 常见问题

| 问题 | 处理 |
| --- | --- |
| 部署后白屏 | 确认 Pages Source 为 GitHub Actions；查看 Action 日志与工件 |
| 想换域名 | 添加 CNAME 记录 + 仓库 Settings → Pages → Custom domain（DNS 指向 GitHub Pages 四组 IP） |
| 想改仓库名 | 若不再用根域名，需把 `base` 改为 `'/<repo>/'`（当前 `'./'` 已兼容） |
