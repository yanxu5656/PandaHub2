# PandaHub2 项目参考文档

## 项目概述

PandaHub2 是一个游戏开黑调度平台，帮助游戏好友协调游戏时间、投票决定玩什么游戏、管理游戏库。

**核心痛点解决**：v1 版本每次页面跳转都刷新，加载 10+ 秒 → v2 采用 SPA 架构，页面切换即时完成。

---

## 技术栈

### 前端
- **React 19** + **TypeScript**
- **Vite 8** - 构建工具
- **Tailwind CSS v4** - 样式框架
- **React Router v7** - 路由管理
- **React Query (@tanstack/react-query)** - 服务端数据缓存（30s staleTime）
- **Zustand** - 全局状态管理（认证状态）

### 后端
- **Supabase** - BaaS（Backend as a Service）
  - Auth - 用户认证（JWT）
  - Postgres - 数据库
  - RLS - 行级安全策略
  - Trigger - 自动创建用户资料

### 部署
- **Cloudflare Pages** - 静态网站托管（全球 CDN）
- **GitHub** - 代码仓库（CI/CD 集成）

---

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  React 组件   │  │  React Query  │  │  Zustand     │  │
│  │  (UI 渲染)    │  │  (数据缓存)   │  │  (认证状态)   │  │
│  ──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Supabase SDK (前端直连)                 │
│  - 自动携带 JWT Token                                    │
│  - 调用 REST API / Realtime                              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    Supabase 云端                         │
│  ──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Auth      │  │   Postgres   │  │     RLS      │  │
│  │  (JWT 认证)   │  │   (数据库)    │  │  (权限控制)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**关键设计**：前端纯静态托管在 CDN，数据读写直接走 Supabase API，无需自建服务器。

---

## 目录结构

```
Pandahub2/
├── public/                  # 静态资源
│   ├── _redirects          # SPA 路由配置（已删除，Cloudflare 自动处理）
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── layout/         # 布局组件
│   │   │   └── Layout.tsx  # 主布局（侧边栏 + 内容区）
│   │   └── ui/             # UI 组件库
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Skeleton.tsx
│   ├── lib/
│   │   ├── supabase.ts     # Supabase 客户端初始化
│   │   └── services.ts     # API 服务层（所有数据库操作）
│   ├── pages/              # 页面组件
│   │   ├── auth/           # 认证页面
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── lobby/          # 大厅
│   │   │   └── LobbyPage.tsx
│   │   ├── schedule/       # 时间协调
│   │   │   └── SchedulePage.tsx
│   │   ├── votes/          # 投票
│   │   │   ├── VotesPage.tsx
│   │   │   └── VoteDetailPage.tsx
│   │   ├── games/          # 游戏库
│   │   │   └── GamesPage.tsx
│   │   ├── minigames/      # 小游戏（占位）
│   │   │   └── MiniGamesPage.tsx
│   │   └── settings/       # 设置
│   │       └── SettingsPage.tsx
│   ├── stores/
│   │   └── authStore.ts    # 认证状态管理（Zustand）
│   ├── App.tsx             # 路由配置
│   ├── main.tsx            # 入口文件
│   ── index.css           # 全局样式 + Tailwind 主题
├── supabase/
│   └── migrations/
│       └── 001_init.sql    # 数据库 Schema + RLS + Trigger
├── .env                    # 环境变量（Supabase 配置）
├── .gitignore
├── package.json
├── tsconfig.app.json
── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 核心功能模块

### 1. 认证系统
- **注册**：邮箱 + 密码 → Supabase Auth → Trigger 自动创建 profiles 记录
- **登录**：JWT Token → 存入 Zustand → 所有请求自动携带
- **状态同步**：`user_metadata` 和 `profiles` 表双源同步（头像/昵称）

### 2. 大厅（Lobby）
- 显示在线用户
- 显示通知
- 快速入口到各功能模块

### 3. 时间协调（Schedule）
- 创建周计划
- 标记空闲时间
- 查看好友时间 overlap

### 4. 投票（Votes）
- 创建投票（玩什么游戏）
- 好友投票
- 实时结果

### 5. 游戏库（Games）
- 手动添加游戏（名称 + Steam App ID + 封面）
- 标记拥有游戏
- 按类型分组显示
- 显示多人共同拥有的游戏

### 6. 设置（Settings）
- 修改昵称
- 选择头像（emoji）
- 同步到 `user_metadata` 和 `profiles`

---

## 数据库 Schema

### 核心表
- **profiles** - 用户资料（id, nickname, avatar_url, created_at）
- **presence** - 在线状态（user_id, status, last_seen）
- **schedules** - 时间计划（id, user_id, week_start, slots[]）
- **votes** - 投票（id, creator_id, game_id, question, expires_at）
- **vote_records** - 投票记录（vote_id, user_id, option）
- **games** - 游戏（id, name, steam_app_id, cover_url, genres[], platform）
- **game_owners** - 游戏拥有者（game_id, user_id）
- **notifications** - 通知（id, user_id, type, content, read）

### RLS 策略
- 所有表启用 RLS
- 用户只能读写自己的数据
- 游戏库/投票可公开读取

### Trigger
- `handle_new_user()` - 注册时自动创建 profiles 记录

---

## 部署流程

### 首次部署
```bash
# 1. 构建
npm run build

# 2. 部署到 Cloudflare Pages
CLOUDFLARE_API_TOKEN=<token> \
CLOUDFLARE_ACCOUNT_ID=<account_id> \
npx wrangler pages deploy dist --project-name pandahub2
```

### 后续更新
```bash
npm run build && npx wrangler pages deploy dist --project-name pandahub2
```

### 环境变量
`.env` 文件（不上传到 git）：
```env
VITE_SUPABASE_URL=https://rmkocwslfzegitgqlqnx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=3faac50466ed4f5293e74c41f9130cdb
```

---

## 开发指南

### 本地开发
```bash
npm install
npm run dev
```
访问 http://localhost:5173

### 添加新页面
1. 在 `src/pages/` 创建组件
2. 在 `src/App.tsx` 添加路由
3. 在 `src/components/layout/Layout.tsx` 添加导航项

### 添加数据库操作
在 `src/lib/services.ts` 添加函数：
```typescript
export async function getSomething(): Promise<Something[]> {
  const { data, error } = await supabase
    .from('something')
    .select('*')
  if (error) throw error
  return data
}
```

### 样式规范
- 使用 Tailwind CSS
- 主题色定义在 `src/index.css` 的 `@theme` 中
- 主色：`#c9a84c`（金色）
- 背景：`#0a0a0b`（深黑）
- 风格：简约高级（非可爱/卡通）

---

## 关键问题解决记录

### 1. 注册报错 "Database error saving new user"
**原因**：缺少 `handle_new_user()` trigger  
**解决**：在 Supabase SQL Editor 运行 trigger 创建 SQL

### 2. 头像修改不生效
**原因**：`user_metadata` 和 `profiles` 表不同步  
**解决**：SettingsPage 同时更新两个源（Promise.all）

### 3. Steam 搜索失败
**原因**：Steam API 不支持 CORS  
**解决**：改为手动添加 + Steam App ID 自动生成封面

### 4. Cloudflare 部署为 Workers 而非 Pages
**原因**：通过 GitHub 连接时被误识别  
**解决**：用 `wrangler pages project create` + `wrangler pages deploy` 命令行部署

### 5. `_redirects` 无限循环
**原因**：Cloudflare Pages 自动处理 SPA 路由，不需要 `_redirects`  
**解决**：删除 `public/_redirects` 文件

---

## 外部服务

### Supabase
- 项目 URL: https://rmkocwslfzegitgqlqnx.supabase.co
- 区域：美国（延迟较高，计划迁移到新加坡）
- 文档：https://supabase.com/docs

### Cloudflare Pages
- 部署 URL: https://pandahub2.pages.dev
- Dashboard: https://dash.cloudflare.com
- 文档：https://developers.cloudflare.com/pages/

### GitHub
- 仓库：https://github.com/yanxu5656/PandaHub2
- 分支：main

---

## 后续优化方向

1. **Supabase 区域迁移**：美国 → 新加坡（降低延迟）
2. **Steam 游戏搜索**：通过 Edge Function 代理 API 请求
3. **实时功能**：Supabase Realtime 推送在线状态/投票更新
4. **小游戏实现**：井字棋、你画我猜等
5. **移动端适配**：响应式优化
6. **PWA 支持**：离线访问 + 安装到桌面

---

**最后更新**：2026-09-19  
**版本**：v2.0.0（SPA 重构版）
