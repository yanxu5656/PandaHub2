import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore } from '@/stores/circleStore'
import { updatePresence } from '@/lib/services'
import PandaFace from '@/components/ui/PandaFace'

const navItems = [
  { path: '/', label: '大厅', en: 'Lobby', icon: HomeIcon },
  { path: '/schedule', label: '时间协调', en: 'Schedule', icon: CalendarIcon },
  { path: '/votes', label: '投票', en: 'Votes', icon: VoteIcon },
  { path: '/games', label: '游戏库', en: 'Games', icon: GamesIcon },
  { path: '/minigames', label: '小游戏', en: 'Arcade', icon: MiniGameIcon },
  { path: '/rides', label: '开黑车', en: 'Rides', icon: CarIcon },
  { path: '/circle', label: '圈子设置', en: 'Circle', icon: CircleIcon },
  { path: '/settings', label: '设置', en: 'Settings', icon: SettingsIcon },
]

const ROLE_LABEL: Record<string, string> = { owner: '圈主', admin: '管理员', member: '成员' }

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function VoteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function GamesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="11" x2="15" y2="11" />
      <line x1="18" y1="13" x2="18" y2="13" />
    </svg>
  )
}

function MiniGameIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 11h18v6a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H6.5v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <circle cx="7" cy="14" r="0.5" />
      <circle cx="17" cy="14" r="0.5" />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 15.5a4.5 4.5 0 0 1 5.5 4.5" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function Layout() {
  const { user, signOut } = useAuthStore()
  const { circles, currentId, platformRole, loaded, load, setCurrent } = useCircleStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    closeSidebar()
  }, [location.pathname])

  // 加载我的圈子（登录后一次）
  useEffect(() => {
    if (user?.id) load(user.id)
  }, [user?.id, load])

  // 在线心跳：进入任意页面即上报，之后每 2 分钟一次（在线判定阈值 5 分钟）
  useEffect(() => {
    if (!user) return
    const beat = () => updatePresence().catch(() => {})
    beat()
    const timer = setInterval(beat, 120_000)
    return () => clearInterval(timer)
  }, [user])

  const current = circles.find(c => c.id === currentId) ?? null
  const userAvatar = user?.user_metadata?.avatar_url
  const userIsEmoji = userAvatar && !userAvatar.startsWith('http')
  const userInitial = user?.user_metadata?.nickname?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  const switchCircle = (id: string) => {
    setCurrent(id)
    setSwitcherOpen(false)
    navigate('/')
  }

  const circleSwitcher = (
    <div className="px-4 pb-2 shrink-0 relative">
      <button
        onClick={() => setSwitcherOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-accent-dim/60 border border-accent/20 hover:bg-accent-dim transition-colors cursor-pointer text-left"
        aria-label="切换圈子"
        aria-expanded={switcherOpen}
      >
        <span className="w-8 h-8 rounded-full bg-linear-to-br from-accent-hover to-accent-deep text-white flex items-center justify-center text-sm font-bold shrink-0">
          {current?.name?.[0] ?? '?'}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-accent-deep truncate">{current?.name ?? '选择圈子'}</span>
          <span className="block text-xs text-text-muted mt-0.5">
            {current ? ROLE_LABEL[current.my_role] : '未加入圈子'}
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-accent-deep transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {switcherOpen && (
        <div className="absolute left-4 right-4 top-full mt-2 z-30 rounded-2xl bg-white border border-white/90 shadow-[0_12px_40px_rgba(83,96,83,0.22)] overflow-hidden animate-fade-in">
          <div className="max-h-64 overflow-auto py-1.5">
            {circles.map(c => (
              <button
                key={c.id}
                onClick={() => switchCircle(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                  c.id === currentId ? 'bg-accent-dim' : 'hover:bg-bg-hover'
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-bg-hover ring-1 ring-hairline flex items-center justify-center text-xs font-bold text-accent-deep shrink-0">
                  {c.name?.[0] ?? '?'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{c.name}</span>
                  <span className="block text-xs text-text-muted">{ROLE_LABEL[c.my_role]}</span>
                </span>
                {c.id === currentId && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-deep shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="border-t border-hairline p-1.5">
            <button
              onClick={() => { setSwitcherOpen(false); navigate('/join') }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-accent-deep hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {(platformRole === 'super' || platformRole === 'creator') ? '加入 / 创建圈子' : '用邀请码加入圈子'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="pt-8 pb-4 px-7 shrink-0">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="transition-transform duration-300 group-hover:animate-[wiggle_0.6s_ease-in-out_infinite]">
            <PandaFace size={40} />
          </div>
          <p className="font-display text-[26px] leading-none font-bold tracking-wide">
            Panda<span className="gold-text">Hub</span>
          </p>
        </div>
      </div>

      {circleSwitcher}

      {/* Nav */}
      <nav className="flex-1 pt-3 pb-4 px-4 space-y-3 overflow-auto">
        {navItems.map((item, i) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={closeSidebar}
            style={{ animationDelay: `${i * 40}ms` }}
            className={({ isActive }) =>
              `group relative flex items-center gap-4 px-6 min-h-14 py-4 rounded-full text-lg font-bold transition-all duration-200 cursor-pointer animate-fade-up ${
                isActive
                  ? 'bg-accent-dim text-accent-deep'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full bg-linear-to-b from-accent-hover to-accent-deep" />
                )}
                <item.icon />
                <span className="flex-1">{item.label}</span>
                <span className={`font-display text-[15px] italic ${isActive ? 'text-accent-deep/60' : 'text-text-muted/0 group-hover:text-text-muted/60 transition-colors'}`}>
                  {item.en}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 shrink-0">
        <div className="bg-white rounded-2xl border border-white/90 px-5 py-4 flex items-center gap-3.5 shadow-[0_8px_28px_rgba(83,96,83,0.18)]">
          <div className="w-11 h-11 rounded-full bg-bg-hover ring-1 ring-hairline flex items-center justify-center shrink-0">
            {userIsEmoji ? (
              <span className="text-xl leading-none">{userAvatar}</span>
            ) : (
              <span className="text-base font-semibold text-accent-deep">{userInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium leading-snug break-all">{user?.user_metadata?.nickname ?? user?.email?.split('@')[0] ?? '用户'}</p>
          </div>
          <button
            onClick={signOut}
            className="p-2.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
            title="退出登录"
            aria-label="退出登录"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar — 悬浮卡片式 */}
      <aside className="hidden lg:flex w-[288px] m-4 rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_12px_48px_rgba(83,96,83,0.16)] flex-col shrink-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#35323a]/30 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar — 同样悬浮 */}
      <aside
        className={`fixed inset-y-2 left-2 z-50 w-[280px] bg-white/80 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-[0_12px_48px_rgba(83,96,83,0.24)] flex flex-col shrink-0 transform transition-transform duration-200 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 flex items-center px-4 border-b border-hairline bg-white/70 backdrop-blur-2xl shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            aria-label="打开菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="ml-3 flex items-center gap-2 font-display text-lg font-bold tracking-wide">
            <PandaFace size={28} />
            Panda<span className="gold-text">Hub</span>
          </span>
        </div>

        <main className="flex-1 overflow-auto">
          {!loaded ? (
            <div className="h-full flex flex-col items-center justify-center gap-5">
              <div className="animate-bounce"><PandaFace size={56} /></div>
              <p className="text-text-secondary font-display tracking-widest">加载圈子中...</p>
            </div>
          ) : !currentId && location.pathname !== '/join' ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 px-6 text-center">
              <PandaFace size={72} />
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">你还没有加入任何圈子</h2>
                <p className="text-text-secondary mt-2 max-w-sm">
                  圈子是独立的小窝 —— 各自的成员、时间表、投票和游戏库。用邀请码加入一个，或联系圈主拉你进去。
                </p>
              </div>
              <button
                onClick={() => navigate('/join')}
                className="px-7 py-3 rounded-full text-[15px] font-bold cursor-pointer bg-linear-to-b from-accent-hover to-accent-deep text-white shadow-[0_4px_14px_rgba(108,191,135,0.35)] hover:brightness-105 active:translate-y-px transition-all"
              >
                用邀请码加入圈子
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
