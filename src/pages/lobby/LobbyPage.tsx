import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useRealtime } from '@/hooks/useRealtime'
import {
  getAllProfiles,
  getOnlineUserIds,
  getNotifications,
  getVotes,
  markAllNotificationsRead,
  updatePresence,
  type Profile,
  type Notification,
  type Vote,
} from '@/lib/services'

const quickActions = [
  { label: '填写本周时间', path: '/schedule', icon: CalendarIcon, color: 'text-blue-400' },
  { label: '发起投票', path: '/votes', icon: VoteIcon, color: 'text-purple-400' },
  { label: '管理游戏库', path: '/games', icon: GamesIcon, color: 'text-green-400' },
  { label: '玩小游戏', path: '/minigames', icon: MiniGameIcon, color: 'text-orange-400' },
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

function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-base'
  const isEmoji = profile.avatar_url && !profile.avatar_url.startsWith('http')
  const initials = (profile.nickname || '?').slice(0, 1)
  return (
    <div className={`${sizeClass} rounded-full bg-bg-hover flex items-center justify-center font-medium text-text-secondary shrink-0`}>
      {isEmoji ? (
        <span className="leading-none">{profile.avatar_url}</span>
      ) : profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

function MemberRow({ profile, isOnline }: { profile: Profile; isOnline: boolean }) {
  const { user } = useAuthStore()
  const isAdmin = profile.role === 'admin'
  const isMe = profile.id === user?.id

  return (
    <div className="flex items-center gap-4 py-3">
      <Avatar profile={profile} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium truncate">
          {profile.nickname}
          {isMe && <span className="text-text-muted ml-2 text-sm font-normal">(我)</span>}
        </p>
      </div>
      {isAdmin && (
        <span className="px-2.5 py-1 rounded-lg text-xs bg-accent-dim text-accent font-medium">管理员</span>
      )}
      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-success' : 'bg-border'}`} />
    </div>
  )
}

function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <div className="py-4 border-b border-border last:border-0">
      <p className="text-[15px] text-text-primary leading-relaxed">{notification.content}</p>
      <p className="text-sm text-text-muted mt-2">{new Date(notification.created_at).toLocaleDateString('zh-CN')}</p>
    </div>
  )
}

function ActiveVoteCard({ vote }: { vote: Vote }) {
  return (
    <Link to={`/votes/${vote.id}`} className="block py-4 border-b border-border last:border-0 hover:bg-bg-hover/50 px-2 rounded-lg transition-colors">
      <p className="text-[15px] font-medium">{vote.title}</p>
      <p className="text-sm text-text-muted mt-1.5">
        {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
      </p>
    </Link>
  )
}

export default function LobbyPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (user) updatePresence()
  }, [user])

  useRealtime('presence', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['online'] })
  })

  useRealtime('notifications', 'INSERT', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  useRealtime('votes', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['votes'] })
  })

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: getAllProfiles,
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
    queryKey: ['votes', 'active'],
    queryFn: () => getVotes('active'),
  })

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">大厅</h1>
        <p className="text-text-secondary text-base mt-2">欢迎回来，{user?.user_metadata?.nickname ?? '朋友'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column — Members + Notifications */}
        <div className="lg:col-span-3 space-y-8">
          {/* Members */}
          <Card
            title="成员"
            action={
              <span className="text-sm text-text-secondary">
                {onlineIds?.length ?? 0} 在线 / {profiles?.length ?? 0} 成员
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
              <div className="divide-y divide-border">
                {profiles?.map(p => (
                  <MemberRow key={p.id} profile={p} isOnline={onlineIds?.includes(p.id) ?? false} />
                ))}
              </div>
            )}
          </Card>

          {/* Notifications */}
          <Card
            title="通知"
            action={
              unreadCount > 0 ? (
                <button onClick={handleMarkAllRead} className="text-sm text-text-secondary hover:text-accent transition-colors">
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
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Actions */}
          <Card title="快速入口">
            <div className="space-y-3">
              {quickActions.map(action => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border hover:bg-bg-hover hover:border-border-light transition-all group"
                >
                  <span className={`${action.color} group-hover:scale-110 transition-transform`}>
                    <action.icon />
                  </span>
                  <span className="text-[15px] font-medium">{action.label}</span>
                  <svg className="w-5 h-5 ml-auto text-text-muted group-hover:text-text-secondary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </Card>

          {/* Active Votes */}
          <Card
            title="进行中的投票"
            action={
              <Link to="/votes" className="text-sm text-text-secondary hover:text-accent transition-colors">
                查看全部
              </Link>
            }
          >
            {activeVotes && activeVotes.length > 0 ? (
              <div>
                {activeVotes.map(v => (
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
