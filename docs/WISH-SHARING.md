# 祈福墙共享化：未来方案与限制

当前实现（`src/lib/wishes.ts`）：
- 心愿保存在**访问者自己浏览器**的 localStorage（键 `hdc.wishes`），不上传任何服务器；
- 可删除“自己的”心愿（`owner === 本机设备 ID`）；支持 JSON 导出/导入备份；
- 数据层已抽象为 `WishRepository` 接口（`list/create/remove/importMany`），
  未来切换共享后端**只改一行工厂函数**（`createWishRepository()`），UI 零改动。

## 方案 A：GitHub Issues API（推荐，已预留实现）

把仓库的 issue 当作“共享心愿墙”，**无需自建服务器**：

| 操作 | API |
| --- | --- |
| 发布心愿 | `POST /repos/{owner}/{repo}/issues`，`title: "祈福：称呼"`，`body: 心愿`，`labels: ["wish"]` |
| 读取心愿墙 | `GET /repos/{owner}/{repo}/issues?state=open&labels=wish&per_page=100` |
| 删除/关闭 | `PATCH .../issues/{n}` `state: closed`（需仓库写权限） |

要点与限制：
1. **配额**：未认证 60 次/小时/IP；带令牌 5000 次/小时——访客匿名发布需要代理，见方案 B。
2. **写权限**：任何 GitHub 账号都可用自己的 token 向**公开仓库**发 issue（无需仓库权限），
   但匿名（无 token）不能 POST——所以“谁都能发”的公开墙必须中间垫一层代理。
3. **撤回权**：issue 的关闭需要写权限，访客不能撤回自己的心愿 → 产品上改为
   “联系管理员移除”或“心愿保留 30 天后自动隐藏”（用 GitHub Action 定时关闭旧 issue）。
4. **零密钥原则**：token 只允许访客自备（放在输入框、只存浏览器），
   或经方案 B 的服务端注入——**绝不允许把站长 PAT 打进前端仓库**。

## 方案 B：GitHub Action 定时任务 + issue 作为数据库（仍无自建服务器）

1. 访客点“点亮心灯”→ 前端把心愿 POST 到仓库的
   `https://api.github.com/repos/{owner}/{repo}/dispatches`？——不行，dispatches 需要 token。
   **替代**：访客直接打开一个预填好的 `issues/new` 链接
   （`https://github.com/{owner}/{repo}/issues/new?title=祈福：xxx&body=xxx&labels=wish`），
   在 GitHub 网页完成发布——**零 token、零后端、零密钥**，体验略打折但完全可行。
2. 仓库放一个定时 Action（每小时），用 `GITHUB_TOKEN` 读取 `labels=wish` 的 open issues，
   汇总成 `src/content/wishes.json` 提交回仓库；站点部署 Action 随之更新——
   即“**Issue 是数据库，Actions 是后端，Pages 是前台**”。
3. 站点从 `wishes.json` 读共享墙，本地心愿仍存 localStorage，两者合并展示。

## 方案 C：其他免费无服务器替代

| 服务 | 思路 | 限制 |
| --- | --- | --- |
| Giscus / utterances | 用 GitHub Discussions/Issues 做评论区 | 评论即心愿；需访客 GitHub 登录 |
| Supabase / Firebase 免费档 | BaaS：`anon` 公开密钥可下发前端，行级安全（RLS）限制每人只能删自己的 | 依赖第三方，超出“无自建后端”但无需自建；密钥需换成公开 anon key |
| Deno Deploy / Cloudflare Workers 免费档 | 极薄代理：把心愿转发到 GitHub Issues（保住“数据在 GitHub”） | 有“Serverless 后端”，但免费、零维护 |
| WebTorrent / IPFS + OrbitDB | 去中心化共愿墙 | 无持久节点则数据易丢失，实现复杂度高 |
| Val Town / jsonblob 类 | 免费 JSON 存储 | 无鉴权，公开可写可删，不适合 |

## 结论

- **当前**：本地心愿墙 + JSON 导出/导入，完全离线、隐私安全（这正是纯静态的第一步）；
- **下一步（推荐）**：方案 B——预填 issue 链接 + 定时 Action 汇总发布，
  真正“零服务器、零密钥、数据公开可审计”，且与本站的 GitHub Pages 技术栈天然同构；
- **不推荐**：把任何 PAT/私钥写进前端仓库；涉及他人可读内容时，务必在祈福页标注
  “发布即公开”的知情同意提示。
