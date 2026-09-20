import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { updatePresence } from '@/lib/services'
import PandaFace from '@/components/ui/PandaFace'

const navItems = [
  { path: '/', label: '大厅', en: 'Lobby', icon: HomeIcon },
  { path: '/schedule', label: '时间协调', en: 'Schedule', icon: CalendarIcon },
  { path: '/votes', label: '投票', en: 'Votes', icon: VoteIcon },
  { path: '/games', label: '游戏库', en: 'Games', icon: GamesIcon },
  { path: '/minigames', label: '小游戏', en: 'Arcade', icon: MiniGameIcon },
  { path: '/settings', label: '设置', en: 'Settings', icon: SettingsIcon },
]

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    closeSidebar()
  }, [location.pathname])

  // 在线心跳：进入任意页面即上报，之后每 2 分钟一次（在线判定阈值 5 分钟）
  useEffect(() => {
    if (!user) return
    const beat = () => updatePresence().catch(() => {})
    beat()
    const timer = setInterval(beat, 120_000)
    return () => clearInterval(timer)
  }, [user])

  const userAvatar = user?.user_metadata?.avatar_url
  const userIsEmoji = userAvatar && !userAvatar.startsWith('http')
  const userInitial = user?.user_metadata?.nickname?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="pt-8 pb-6 px-7 shrink-0">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="transition-transform duration-300 group-hover:animate-[wiggle_0.6s_ease-in-out_infinite]">
            <PandaFace size={40} />
          </div>
          <p className="font-display text-[26px] leading-none font-bold tracking-wide">
            Panda<span className="gold-text">Hub</span>
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 pt-5 pb-4 px-4 space-y-3 overflow-auto">
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
        <div className="surface rounded-xl px-5 py-4 flex items-center gap-3.5">
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[280px] bg-white/70 backdrop-blur-2xl border-r border-hairline flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#35323a]/30 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white/70 backdrop-blur-2xl border-r border-hairline flex flex-col shrink-0 transform transition-transform duration-200 ease-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
