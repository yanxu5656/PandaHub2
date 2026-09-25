import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore } from '@/stores/circleStore'
import { useRealtime } from '@/hooks/useRealtime'
import {
  getCircleMembers,
  getOnlineUserIds,
  getNotifications,
  getVotes,
  markAllNotificationsRead,
  type Profile,
  type CircleRole,
  type Notification,
  type Vote,
} from '@/lib/services'

const quickActions = [
  { label: '填写本周时间', en: 'Schedule', path: '/schedule', icon: CalendarIcon, color: 'text-blue-500' },
  { label: '发起投票', en: 'Votes', path: '/votes', icon: VoteIcon, color: 'text-purple-500' },
  { label: '管理游戏库', en: 'Library', path: '/games', icon: GamesIcon, color: 'text-emerald-500' },
  { label: '玩小游戏', en: 'Arcade', path: '/minigames', icon: MiniGameIcon, color: 'text-orange-500' },
]

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function VoteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function GamesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
    </svg>
  )
}
function MiniGameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return { zh: '夜深了', en: 'Late night' }
  if (h < 11) return { zh: '早上好', en: 'Good morning' }
  if (h < 14) return { zh: '中午好', en: 'Good noon' }
  if (h < 18) return { zh: '下午好', en: 'Good afternoon' }
  return { zh: '晚上好', en: 'Good evening' }
}

function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-base'
  const isEmoji = profile.avatar_url && !profile.avatar_url.startsWith('http')
  const initials = (profile.nickname || '?').slice(0, 1)
  return (
    <div className={`${sizeClass} rounded-full bg-bg-hover ring-1 ring-hairline flex items-center justify-center font-medium text-text-secondary shrink-0`}>
      {isEmoji ? (
        <span className="leading-none">{profile.avatar_url}</span>
      ) : profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span className="text-accent-deep">{initials}</span>
      )}
    </div>
  )
}

const CIRCLE_ROLE_LABEL: Record<CircleRole, string> = { owner: '圈主', admin: '管理员', member: '成员' }

function MemberRow({ profile, isOnline, role }: { profile: Profile; isOnline: boolean; role: CircleRole }) {
  const { user } = useAuthStore()
  const isMe = profile.id === user?.id

  return (
    <div className="flex items-center gap-4 py-4 group">
      <div className="relative shrink-0">
        <Avatar profile={profile} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-success' : 'bg-border-light'}`}
          title={isOnline ? '在线' : '离线'}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">
          {profile.nickname}
          {isMe && <span className="text-text-muted ml-2 text-sm font-normal">(我)</span>}
        </p>
        <p className="text-xs text-text-muted mt-0.5">{isOnline ? '在线' : '离线'}</p>
      </div>
      {role !== 'member' && (
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${role === 'owner' ? 'bg-blush-dim text-blush-deep' : 'bg-accent-dim text-accent-deep'}`}>
          {CIRCLE_ROLE_LABEL[role]}
        </span>
      )}
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="relative py-4 pl-5 pr-2 border-b border-hairline last:border-0">
      {!notification.is_read && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-linear-to-b from-accent-hover to-accent-deep" />
      )}
      <p className={`leading-relaxed ${notification.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'} text-[15px]`}>
        {notification.circle?.name && (
          <span className="text-accent-deep font-medium">【{notification.circle.name}】</span>
        )}
        {notification.content}
      </p>
      <p className="text-sm text-text-muted mt-1.5 num">{new Date(notification.created_at).toLocaleDateString('zh-CN')}</p>
    </div>
  )
}

function ActiveVoteCard({ vote }: { vote: Vote }) {
  return (
    <Link to={`/votes/${vote.id}`} className="block py-4 border-b border-hairline last:border-0 hover:bg-bg-hover/40 px-2 rounded-lg transition-colors group">
      <p className="text-[15px] font-medium group-hover:text-accent-deep transition-colors">{vote.title}</p>
      <p className="text-sm text-text-muted mt-1.5">
        {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
      </p>
    </Link>
  )
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="surface rounded-xl px-6 py-6 flex items-center gap-5 h-full">
      <span className={`font-display text-5xl leading-none num ${accent ? 'gold-text italic' : ''}`}>{value}</span>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="text-sm text-text-secondary mt-1.5">{label === '在线' ? '人在线' : label === '成员' ? '位成员' : label === '进行中投票' ? '个投票进行中' : '条未读通知'}</p>
      </div>
    </div>
  )
}

export default function LobbyPage() {
  const { user } = useAuthStore()
  const { currentId, circles } = useCircleStore()
  const queryClient = useQueryClient()
  const circle = circles.find(c => c.id === currentId) ?? null

  useRealtime('presence', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['online'] })
  })

  useRealtime('notifications', 'INSERT', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  useRealtime('votes', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['votes'] })
  })

  useRealtime('circle_members', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['circle-members', currentId] })
  })

  const { data: members, isLoading: loadingProfiles } = useQuery({
    queryKey: ['circle-members', currentId],
    queryFn: () => getCircleMembers(currentId!),
    enabled: !!currentId,
  })

  const { data: onlineIds } = useQuery({
    queryKey: ['online'],
    queryFn: () => getOnlineUserIds(),
    refetchInterval: 30_000,
  })

  const { data: notifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
  })

  const { data: activeVotes } = useQuery({
    queryKey: ['votes', currentId, 'active'],
    queryFn: () => getVotes(currentId!, 'active'),
    enabled: !!currentId,
  })

  const memberProfiles = (members ?? []).map(m => m.profile!).filter(Boolean)
  const onlineMemberIds = (members ?? [])
    .map(m => m.user_id)
    .filter(id => onlineIds?.includes(id) ?? false)
  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0
  const liveVotes = (activeVotes ?? []).filter(
    v => !v.expires_at || new Date(v.expires_at) >= new Date(),
  )

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const g = greeting()
  const nickname = user?.user_metadata?.nickname ?? '朋友'
  const now = new Date()
  const dateLine = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}`

  return (
    <div className="page-wrap">
      {/* Editorial header */}
      <header className="mb-10 animate-fade-up">
        <p className="eyebrow mb-3">{g.en} · {dateLine}{circle ? ` · ${circle.name}` : ''}</p>
        <h1 className="text-4xl lg:text-5xl 3xl:text-6xl font-semibold tracking-tight leading-tight">
          {g.zh}，<span className="gold-text font-display text-5xl lg:text-6xl 3xl:text-7xl italic tracking-normal">{nickname}</span>
        </h1>
        <p className="text-text-secondary text-base mt-3">今晚谁来集结？先看时间、再投票、然后开玩。</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        <div className="animate-fade-up" style={{ animationDelay: '60ms' }}>
          <StatTile label="在线" value={onlineMemberIds.length} accent />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <StatTile label="成员" value={memberProfiles.length} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '180ms' }}>
          <StatTile label="进行中投票" value={liveVotes.length} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '240ms' }}>
          <StatTile label="未读通知" value={unreadCount} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column — Members + Notifications */}
        <div className="lg:col-span-3 space-y-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <Card
            title="成员"
            eyebrow="Members"
            action={
              <span className="text-sm text-text-secondary">
                <span className="num text-success font-medium">{onlineMemberIds.length}</span> 在线 / <span className="num">{memberProfiles.length}</span> 成员
              </span>
            }
          >
            {loadingProfiles ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-hairline">
                {members?.map(m => (
                  <MemberRow
                    key={m.user_id}
                    profile={m.profile!}
                    role={m.role}
                    isOnline={onlineIds?.includes(m.user_id) ?? false}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card
            title="通知"
            eyebrow="Notifications"
            action={
              unreadCount > 0 ? (
                <button onClick={handleMarkAllRead} className="text-sm text-text-secondary hover:text-accent-deep transition-colors cursor-pointer">
                  全部已读
                </button>
              ) : undefined
            }
          >
            {loadingNotifications ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div>
                {notifications.map(n => (
                  <NotificationItem key={n.id} notification={n} />
                ))}
              </div>
            ) : (
              <p className="text-base text-text-muted text-center py-6">暂无通知</p>
            )}
          </Card>
        </div>

        {/* Right column — Quick Actions + Active Votes */}
        <div className="lg:col-span-2 space-y-8 animate-fade-up" style={{ animationDelay: '380ms' }}>
          <Card title="快速入口" eyebrow="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(action => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex flex-col gap-5 p-5 rounded-xl border border-hairline bg-bg-elevated/40 hover:bg-bg-hover/70 hover:border-accent/25 transition-all duration-200 group"
                >
                  <span className={`w-11 h-11 rounded-xl bg-bg-hover/80 border border-hairline flex items-center justify-center ${action.color} group-hover:border-accent/30 group-hover:bg-accent-dim group-hover:text-accent-deep transition-all duration-200`}>
                    <action.icon />
                  </span>
                  <div>
                    <span className="text-[15px] font-medium">{action.label}</span>
                    <p className="font-display italic text-xs text-text-muted mt-1">{action.en}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card
            title="进行中的投票"
            eyebrow="Live Votes"
            action={
              <Link to="/votes" className="text-sm text-text-secondary hover:text-accent-deep transition-colors">
                查看全部
              </Link>
            }
          >
            {liveVotes.length > 0 ? (
              <div>
                {liveVotes.map(v => (
                  <ActiveVoteCard key={v.id} vote={v} />
                ))}
              </div>
            ) : (
              <p className="text-base text-text-muted text-center py-6">暂无进行中的投票</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
