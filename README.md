<div align="center">

# Panda<span>Hub</span>

**游戏开黑调度平台 · Game Lodge**

和朋友们协调游戏时间、投票决定玩什么、管理共同游戏库 —— 一个安静的线上小屋。

[![Live](https://img.shields.io/badge/Live-ph.156560.xyz-6cbf87?style=flat-square&logo=cloudflare&logoColor=white)](https://ph.156560.xyz)
[![Version](https://img.shields.io/badge/version-v1.1.0-4d9e6a?style=flat-square)](https://github.com/yanxu5656/PandaHub2/releases/tag/v1.1.0)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_·_Postgres_·_Realtime-3ecf8e?style=flat-square&logo=supabase&logoColor=white)

</div>

---

## ✦ 为什么做这个

每个开黑群都见过这样的场面：群里问"今晚玩什么"，回复散落在几十条消息里；谁有空谁没空全靠猜；想一起玩的游戏没人记得谁买了。

**PandaHub 把这些杂乱收敛成一个房间**：拖一下鼠标就能标记空闲时段，竹绿热力图直接告诉你大家的重叠时间；投票有实时结果；游戏库按分类聚合，还能看到"两个人以上都有"的游戏。

> v1 每次跳转都整页刷新、加载 10+ 秒。v2 是一次彻底重写：纯静态 SPA + 数据直连，页面切换即时完成。

---

## ✦ 功能

| 模块 | 说明 |
|---|---|
| **大厅** | 成员在线状态（Supabase Realtime 实时推送）、通知中心、快捷入口 |
| **时间协调** | 周视图日历，按住拖拽框选空闲时段；竹绿热力图叠加全员时间，高亮共同空闲区间 |
| **投票** | 发起"今晚玩什么"，一人一票、实时计票、支持截止时间，详情页展示各选项占比 |
| **游戏库** | 手动添加游戏，多分类标签（预设 12 类 + 自定义分类），按分类分组展示，一键标记"我也有"，自动汇总多人共有的游戏 |
| **设置** | 昵称与头像（emoji）管理，`user_metadata` 与 `profiles` 双源同步 |
| **认证** | 邮箱注册 / 登录，注册时 Trigger 自动建档，JWT 会话 |

---

## ✦ 技术栈

<table>
<tr>
<td width="33%">

### 前端

- React 19 + TypeScript
- Vite 8（rolldown）
- Tailwind CSS v4（`@theme` 设计令牌）
- React Router v7
- TanStack React Query（30s 缓存 + 乐观更新）
- Zustand（认证状态）

</td>
<td width="33%">

### 后端

- Supabase（BaaS）
  - Auth — JWT 邮箱登录
  - Postgres — 8 张核心表
  - RLS — 行级安全策略
  - Realtime — 在线状态 / 投票实时推送
  - Trigger — 注册自动创建资料

</td>
<td width="34%">

### 部署

- Cloudflare Pages（全球 CDN）
- GitHub 集成自动部署（push 即上线）
- 字体本地打包（@fontsource，不依赖 Google Fonts，国内可直连加载）

</td>
</tr>
</table>

---

## ✦ 架构

```
┌────────────────────────────── 浏览器 ──────────────────────────────┐
│   React 组件（UI）  ·  React Query（数据缓存）  ·  Zustand（会话）   │
└───────────────────────────────┬────────────────────────────────────┘
                                │  Supabase SDK（自动携带 JWT）
┌───────────────────────────────▼────────────────────────────────────┐
│                            Supabase 云端                            │
│      Auth（JWT）    │    Postgres（RLS + Trigger）    │  Realtime    │
└─────────────────────────────────────────────────────────────────────┘

        前端为纯静态站点，托管于 Cloudflare Pages —— 无自建服务器。
```

**设计语言「Cute Glass Panda」**：奶油底色 `#f7f6f2` + 竹绿主色 `#6cbf87` + 腮红粉点缀，Nunito / Quicksand 圆润字体，毛玻璃卡片、柔光色斑背景、爪印鼠标轨迹 —— 可爱简洁，又不失精致质感。

## ✦ 数据库

```
profiles ─┬─ presence        （在线状态）
          ├─ schedules        （每周空闲时段 slots[]）
          ├─ votes ── vote_records   （投票 & 记票）
          ├─ game_owners ── games    （谁拥有什么游戏）
          └─ notifications   （站内通知）
```

所有表启用 RLS：用户只能改自己的数据，游戏库与投票对全员可读。迁移脚本见 [`supabase/migrations/001_init.sql`](./supabase/migrations/001_init.sql)。

---

## ✦ 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env   # 填入你自己的 Supabase 项目信息

# 3. 启动开发服务器
npm run dev
```

`.env` 内容：

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

数据库初始化：在 Supabase SQL Editor 中执行 `supabase/migrations/001_init.sql`（建表 + RLS + 注册 Trigger）。

## ✦ 部署

```bash
npm run build
npx wrangler pages deploy dist --project-name pandahub2
```

日常更新只需 `git push` —— Cloudflare Pages 已连接本仓库 `main` 分支，自动构建上线。注意 `.env` 中的 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` 为本地部署密钥，不入库；线上环境变量在 Cloudflare Dashboard 中配置（类型选 **Text**，否则会被加密导致构建失败）。

---

## ✦ 目录结构

```
src/
├── components/
│   ├── layout/        Layout（侧边栏外壳）· AuthShell（认证页外壳）
│   └── ui/            Button · Card · Skeleton
├── lib/
│   ├── supabase.ts    客户端初始化
│   └── services.ts    数据服务层（所有数据库操作）
├── pages/             lobby · schedule · votes · games · settings · auth · minigames
├── stores/            authStore（Zustand）
├── index.css          设计令牌 @theme + 全局质感样式
└── App.tsx            路由表
```

---

## ✦ 路线图

- [ ] Supabase 区域迁移：美国 → 新加坡（降低国内延迟）
- [ ] Edge Function 代理 Steam 搜索，一键导入游戏
- [ ] 小游戏实装：井字棋、你画我猜
- [ ] PWA：离线访问 + 安装到桌面
- [ ] 移动端响应式进一步优化

---

<div align="center">

*Made for the squad. 🐼*

MIT License © [yanxu5656](https://github.com/yanxu5656)

</div>
