<div align="center">

# Panda<span>Hub</span>

**游戏开黑调度平台 · Game Lodge**

和朋友们协调游戏时间、投票决定玩什么、管理共同游戏库、开一辆黑车 —— 一个安静的线上小屋。

[![Live](https://img.shields.io/badge/Live-ph.156560.xyz-6cbf87?style=flat-square&logo=cloudflare&logoColor=white)](https://ph.156560.xyz)
[![Version](https://img.shields.io/badge/version-v2.1.2-4d9e6a?style=flat-square)](https://github.com/yanxu5656/PandaHub2/releases/tag/v2.1.2)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_·_Postgres_·_Realtime-3ecf8e?style=flat-square&logo=supabase&logoColor=white)

</div>

---

## 目录

- [为什么做这个](#为什么做这个)
- [功能一览](#功能一览)
- [技术栈](#技术栈)
- [架构](#架构)
- [数据库](#数据库)
- [快速开始](#快速开始)
- [部署与发布](#部署与发布)
- [目录结构](#目录结构)
- [版本历史](#版本历史)
- [路线图](#路线图)

---

## 为什么做这个

每个开黑群都见过这样的场面：群里问"今晚玩什么"，回复散落在几十条消息里；谁有空谁没空全靠猜；想一起玩的游戏没人记得谁买了。

**PandaHub 把这些杂乱收敛成一个房间**：拖一下鼠标就能标记空闲时段，竹绿热力图直接告诉你大家的重叠时间；投票有实时结果；游戏库按分类聚合，还能看到"两个人以上都有"的游戏；到点要开车了，发一辆"开黑车"，谁上车谁没上，座位一目了然。

> v1 每次跳转都整页刷新、加载 10+ 秒。v2 是一次彻底重写：纯静态 SPA + 数据直连 Supabase，页面切换即时完成。

---

## 功能一览

### 组织与协作

| 模块 | 说明 |
|---|---|
| **圈子** | 多个完全独立的小窝 —— 成员、时间协调、投票、游戏库、小游戏、开黑车各自隔离；一个用户可加入多个圈子，侧边栏一键切换；邀请码 / 链接随时加入（永不过期）；圈主与管理员可踢人、删除任何内容；两级角色：平台超管 / 圈内 owner·admin·member |
| **大厅** | 圈内成员在线状态（Supabase Realtime 实时推送）、通知中心（带圈名前缀）、快捷入口 |
| **设置** | 昵称与头像（emoji）管理，`user_metadata` 与 `profiles` 双源同步 |
| **认证** | 邮箱注册 / 登录，注册时 Trigger 自动建档，JWT 会话 |

### 玩在一起

| 模块 | 说明 |
|---|---|
| **时间协调** | 周视图日历，按住拖拽框选空闲时段；竹绿热力图叠加全员时间，高亮共同空闲区间 |
| **投票** | 发起"今晚玩什么"，一人一票、实时计票、支持截止时间，详情页展示各选项占比 |
| **游戏库** | 手动添加游戏，多分类标签（预设 12 类 + 自定义分类），按分类分组展示，一键标记"我也有"，自动汇总多人共有的游戏 |
| **开黑约车** | 选一个日期时段 + 多选想玩的游戏发一辆"车"，圈内其他人一键上车；支持车位上限（含司机，满员即止），司机可发车 / 收车 / 请人下车，管理员可介入；发车时全圈推送通知，Realtime 实时刷新座位 |
| **小游戏** | 井字棋 / 五子棋实时对战，基于 Supabase Realtime 房间 |

### 设计语言「Cute Glass Panda」

奶油底色 `#f7f6f2` + 竹绿主色 `#6cbf87` + 腮红粉点缀，香槟金线索；Nunito / Quicksand 圆润字体；毛玻璃卡片、纸纹颗粒、柔光色斑背景、爪印鼠标轨迹 —— 可爱简洁，又不失精致质感。全套令牌在 `src/index.css` 的 `@theme` 中定义，页面通过 `PageHeader` / `.surface` / `.pill` 组件体系共享同一套视觉。

---

## 技术栈

<table>
<tr>
<td width="33%">

### 前端

- React 19 + TypeScript
- Vite 8（rolldown）
- Tailwind CSS v4（`@theme` 设计令牌）
- React Router v7
- TanStack React Query（30s 缓存 + 失效重取）
- Zustand（认证 / 圈子状态）

</td>
<td width="33%">

### 后端

- Supabase（BaaS，无自建服务器）
  - Auth — JWT 邮箱登录
  - Postgres — 8 张核心表
  - RLS — 行级安全策略，按圈隔离
  - Realtime — 在线状态 / 投票 / 座位实时推送
  - RPC — security definer 函数承担敏感写操作
  - Trigger — 注册自动创建资料

</td>
<td width="34%">

### 部署

- Cloudflare Pages（全球 CDN）
- GitHub 集成自动部署（push `main` 即上线）
- 字体本地打包（@fontsource，不依赖 Google Fonts，国内可直连加载）

</td>
</tr>
</table>

---

## 架构

```
┌────────────────────────────── 浏览器 ──────────────────────────────┐
│   React 组件（UI）  ·  React Query（数据缓存）  ·  Zustand（会话）   │
│            services.ts 统一封装所有数据操作，页面不直接碰 SDK         │
└───────────────────────────────┬────────────────────────────────────┘
                                │  Supabase SDK（自动携带 JWT）
┌───────────────────────────────▼────────────────────────────────────┐
│                            Supabase 云端                            │
│   Auth（JWT）  │  Postgres（RLS + RPC + Trigger）  │  Realtime      │
└─────────────────────────────────────────────────────────────────────┘

        前端为纯静态站点，托管于 Cloudflare Pages —— 无自建服务器。
```

几条关键约定：

- **读走 RLS，写走 RPC**：建圈 / 踢人 / 转让 / 发车 / 上车等敏感动作全部经由 `security definer` 函数在服务端校验（成员身份、车位、过期时间），客户端只做友好提示，服务端才是裁判。
- **防超卖**：`join_ride` 对车辆行加 `FOR UPDATE` 锁后再计座，并发上车不会超员。
- **静默失败防护**：直连写操作一律 `.select('id')` 回读 + 长度校验，RLS 拒绝时抛出中文错误而非无声失败。
- **圈子隔离**：所有内容按 `circle_id` 作用域，切换圈子即切换数据命名空间。

---

## 数据库

```
circles ── circle_members ── profiles（两级角色：platform_role 平台层 / circle.role 圈内层）
    │
    ├─ schedules        （每周空闲时段 slots[]，圈内唯一）
    ├─ votes ── vote_records   （投票 & 记票）
    ├─ games ── game_owners    （谁拥有什么游戏）
    ├─ game_sessions    （井字棋 / 五子棋实时对局）
    ├─ rides ── ride_members   （开黑车 & 乘客座位）
    └─ notifications    （站内通知）
```

所有表启用 RLS：读取限本圈成员（或平台超管），写操作限圈内成员；删除类操作限圈主 / 管理员。迁移脚本见 [`supabase/migrations/`](./supabase/migrations)：

| 文件 | 内容 | 依赖 |
|---|---|---|
| `001_init.sql` | 基础表 + profiles Trigger + 通知 | — |
| `003_game_sessions.sql` | 小游戏对局表 | 001 |
| `004_circles.sql` | 多圈子：circles / circle_members、邀请码、全部辅助函数 | 001 |
| `005_rides.sql` | 开黑约车：rides / ride_members + 发车 / 上车 / 踢人 RPC | **004** |

> ⚠️ 必须按 001 → 003 → 004 → 005 顺序执行（005 依赖 004 的辅助函数）。所有迁移均幂等，可重复执行。

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env   # 填入你自己的 Supabase 项目信息

# 3. 初始化数据库
#    在 Supabase SQL Editor 中按顺序执行 supabase/migrations/ 下的 001 → 003 → 004 → 005

# 4. 启动开发服务器
npm run dev
```

`.env` 内容：

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

可用脚本：`npm run dev` 开发 · `npm run build` 构建 · `npm run preview` 预览产物 · `npx tsc -b` 类型检查。

---

## 部署与发布

**日常上线**只需 `git push origin main` —— Cloudflare Pages 已连接本仓库 `main` 分支，自动构建部署。手动部署：

```bash
npm run build
npx wrangler pages deploy dist --project-name pandahub2
```

**发布新版本**（本仓库惯例：版本号 + tag 双记录）：

```bash
npm version X.Y.Z --no-git-tag-version   # 更新 package.json
# 更新 README 徽章 → git commit → git tag vX.Y.Z
git push origin main && git push origin vX.Y.Z   # tag 需显式推送
```

注意：`.env` 中的 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 为本地部署密钥，不入库；线上环境变量在 Cloudflare Dashboard 中配置（类型选 **Text**，否则会被加密导致构建失败）。

---

## 目录结构

```
src/
├── components/
│   ├── layout/        Layout（侧边栏外壳 + 圈子切换）· AuthShell（认证页外壳）
│   └── ui/            Button · Card · PageHeader · Avatar · Skeleton · CursorFx · PandaFace
├── hooks/
│   └── useRealtime.ts Realtime 订阅 → React Query 失效
├── lib/
│   ├── supabase.ts    客户端初始化
│   └── services.ts    数据服务层（所有数据库操作，按模块分节）
├── pages/             lobby · schedule · votes · games · rides · minigames · circle · settings · auth
├── stores/            authStore · circleStore（Zustand）
├── index.css          @theme 设计令牌 + 质感组件层（surface / pill / eyebrow …）
└── App.tsx            路由表
supabase/migrations/   数据库迁移（见「数据库」一节）
```

---

## 版本历史

| 版本 | 里程碑 |
|---|---|
| **v2.1.2** | 全局 UI 高级感打磨 —— 统一页头体系、纸纹颗粒、金色线索、pill 状态徽章 |
| **v2.1.0 / .1** | 开黑约车：时间段 + 多选游戏发车、车位上限、全圈通知、Realtime 座位刷新（.1 为审查修复） |
| **v2.0.0** | 多圈子架构 —— 邀请码入圈、圈子设置、平台管理、全业务页圈子隔离 |
| **v1.3.x** | 井字棋 / 五子棋实时对战、投票关联游戏库、连走与平局修复 |
| **v1.1.x / .2** | 「Cute Glass Panda」主题重做、爪印光标特效、时间协调重写、代码审查修复 |
| **v1.0.0** | SPA 重写首版上线：时间协调、投票、游戏库、通知、Cloudflare 自动部署 |

完整记录见 [Releases](https://github.com/yanxu5656/PandaHub2/releases)。

---

## 路线图

- [ ] Supabase 区域迁移：美国 → 新加坡（降低国内延迟）
- [ ] Edge Function 代理 Steam 搜索，一键导入游戏
- [ ] 更多小游戏：你画我猜等
- [ ] PWA：离线访问 + 安装到桌面
- [ ] 移动端响应式进一步优化

---

<div align="center">

*Made for the squad. 🐼*

MIT License © [yanxu5656](https://github.com/yanxu5656)

</div>
