import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore, isCircleAdmin } from '@/stores/circleStore'
import { useRealtime } from '@/hooks/useRealtime'
import {
  getRides,
  getGames,
  createRide,
  joinRide,
  leaveRide,
  kickRideMember,
  updateRideStatus,
  deleteRide,
  type Ride,
} from '@/lib/services'

const STATUS_META = {
  recruiting: { label: '招募中', cls: 'bg-accent-dim text-accent-deep' },
  driving: { label: '已发车', cls: 'bg-blue-100 text-blue-600' },
  ended: { label: '已结束', cls: 'bg-bg-hover text-text-muted' },
  cancelled: { label: '已取消', cls: 'bg-bg-hover text-text-muted' },
} as const

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, '0')}:00`
}

function fmtDate(d: string) {
  const t = todayStr()
  if (d === t) return '今天'
  const tomorrow = new Date(Date.now() + 86_400_000)
  const tm = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  if (d === tm) return '明天'
  const dt = new Date(d + 'T00:00:00')
  return `${WEEKDAYS[dt.getDay()]} ${d.slice(5).replace('-', '/')}`
}

function takenSeats(r: Ride) {
  return 1 + (r.ride_members?.length ?? 0)
}

function isFull(r: Ride) {
  return r.capacity > 0 && takenSeats(r) >= r.capacity
}

// 与 join_ride RPC 同语义：过去的日期，或今天但结束时间已过
function isExpired(r: Ride) {
  const t = todayStr()
  if (r.ride_date !== t) return r.ride_date < t
  return r.end_hour <= new Date().getHours()
}

function SeatDots({ ride, canKick, onKick }: { ride: Ride; canKick: boolean; onKick: (uid: string) => void }) {
  const members = ride.ride_members ?? []
  const empties = ride.capacity > 0 ? Math.max(0, ride.capacity - takenSeats(ride)) : 0
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5" title={`司机 ${ride.driver?.nickname ?? ''}`}>
        {ride.driver ? <Avatar profile={ride.driver} size="sm" /> : <div className="w-8 h-8 rounded-full bg-bg-hover" />}
        <span className="px-2 py-0.5 rounded-md bg-blush-dim text-blush-deep text-xs font-medium shrink-0">司机</span>
      </div>
      {members.map(m =>
        m.profile ? (
          <span key={m.user_id} className="relative group">
            <Avatar profile={m.profile} size="sm" />
            {canKick && (
              <button
                onClick={() => onKick(m.user_id)}
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-4.5 min-h-4.5 rounded-full bg-danger text-white text-[10px] leading-none flex items-center justify-center cursor-pointer"
                aria-label={`请 ${m.profile.nickname} 下车`}
                title="请下车"
              >
                ×
              </button>
            )}
          </span>
        ) : null,
      )}
      {Array.from({ length: empties }, (_, i) => (
        <div key={i} className="w-8 h-8 rounded-full border-2 border-dashed border-hairline bg-bg-elevated/40" />
      ))}
      <span className="text-xs text-text-muted ml-1">
        {ride.capacity > 0 ? `${takenSeats(ride)}/${ride.capacity} 座` : `${takenSeats(ride)} 人 · 不限车位`}
      </span>
    </div>
  )
}

function RideCard({
  ride,
  userId,
  gameNames,
  admin,
  busy,
  guard,
}: {
  ride: Ride
  userId: string
  gameNames: Record<string, string>
  admin: boolean
  busy: boolean
  guard: (fn: () => Promise<void>) => Promise<void>
}) {
  const isDriver = ride.driver_id === userId
  const joined = isDriver || (ride.ride_members ?? []).some(m => m.user_id === userId)
  const expired = isExpired(ride)
  const meta = STATUS_META[ride.status]
  const games = ride.game_ids.map(id => gameNames[id]).filter(Boolean)
  const canJoin = ride.status === 'recruiting' && !joined && !isFull(ride) && !expired
  const canKick = (isDriver || admin) && ride.status === 'recruiting'
  const canDelete = !joined ? admin : isDriver || admin

  return (
    <div className="py-5 border-b border-hairline last:border-0 group">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[15px] font-bold">
              {fmtDate(ride.ride_date)} {hourLabel(ride.start_hour)} - {hourLabel(ride.end_hour)}
            </p>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${meta.cls}`}>{meta.label}</span>
            {expired && ride.status !== 'ended' && ride.status !== 'cancelled' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-hover text-text-muted">已过期</span>
            )}
            {isFull(ride) && ride.status === 'recruiting' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-danger-dim text-danger">已满</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-text-secondary">
            <span className="truncate">{ride.driver?.nickname ?? '司机'} 开车</span>
            {games.length > 0 ? (
              games.map(g => (
                <span key={g} className="px-2 py-0.5 rounded-md bg-accent-dim text-accent-deep text-xs font-medium">
                  {g}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">游戏待定</span>
            )}
          </div>
          {ride.note && <p className="text-sm text-text-muted mt-1.5 break-words">备注：{ride.note}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canJoin && (
            <Button size="sm" disabled={busy} onClick={() => guard(() => joinRide(ride.id))}>上车</Button>
          )}
          {!isDriver && joined && ride.status === 'recruiting' && (
            <Button size="sm" variant="secondary" disabled={busy}
              onClick={() => guard(async () => {
                if (!window.confirm('确定下车吗？')) return
                await leaveRide(ride.id)
              })}
            >下车</Button>
          )}
          {isDriver && ride.status === 'recruiting' && (
            <>
              {!expired && (
                <Button size="sm" disabled={busy} onClick={() => guard(() => updateRideStatus(ride.id, 'driving'))}>发车</Button>
              )}
              <Button size="sm" variant="ghost" disabled={busy}
                onClick={() => guard(async () => {
                  if (!window.confirm('取消后车票全部作废，确定吗？')) return
                  await updateRideStatus(ride.id, 'cancelled')
                })}
              >取消</Button>
            </>
          )}
          {isDriver && ride.status === 'driving' && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => guard(() => updateRideStatus(ride.id, 'ended'))}>收车</Button>
          )}
          {canDelete && (ride.status === 'ended' || ride.status === 'cancelled') && (
            <button
              onClick={() => guard(async () => {
                if (!window.confirm('删除后不可恢复，确定吗？')) return
                await deleteRide(ride.id)
              })}
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
              aria-label="删除这辆车"
              title="删除"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <SeatDots
          ride={ride}
          canKick={canKick}
          onKick={uid => guard(async () => {
            if (!window.confirm('确定请这位乘客下车吗？')) return
            await kickRideMember(ride.id, uid)
          })}
        />
      </div>
    </div>
  )
}

function CreateRideForm({ currentId, busy, guard, onDone }: { currentId: string; busy: boolean; guard: (fn: () => Promise<void>) => Promise<void>; onDone: () => void }) {
  const [date, setDate] = useState(todayStr())
  const [start, setStart] = useState(20)
  const [end, setEnd] = useState(24)
  const [capacity, setCapacity] = useState(0)
  const [gameIds, setGameIds] = useState<string[]>([])
  const [note, setNote] = useState('')

  const { data: games } = useQuery({
    queryKey: ['games', currentId],
    queryFn: () => getGames(currentId),
  })

  const toggleGame = (id: string) =>
    setGameIds(prev => (prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]))

  const submit = () =>
    guard(async () => {
      if (!date) throw new Error('请选择日期')
      if (end <= start) throw new Error('结束时间必须晚于开始时间')
      await createRide(currentId, { date, startHour: start, endHour: end, gameIds, capacity, note })
      onDone()
    })

  const selectCls = 'input min-w-24'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} className="input" />
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>从</span>
          <select className={selectCls} value={start} onChange={e => setStart(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
          <span>到</span>
          <select className={selectCls} value={end} onChange={e => setEnd(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => h + 1).map(h => (
              <option key={h} value={h}>{hourLabel(h)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>车位</span>
          <select className={selectCls} value={capacity} onChange={e => setCapacity(Number(e.target.value))}>
            <option value={0}>不限</option>
            {[2, 3, 4, 5, 6, 8, 10].map(n => (
              <option key={n} value={n}>{n} 人（含司机）</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-text-secondary mb-2">想玩什么（可多选）</p>
        <div className="flex flex-wrap gap-2">
          {(games ?? []).map(g => {
            const on = gameIds.includes(g.id)
            return (
              <button
                key={g.id}
                onClick={() => toggleGame(g.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  on
                    ? 'bg-accent-dim border-accent/30 text-accent-deep'
                    : 'bg-bg-elevated/60 border-hairline text-text-secondary hover:text-accent-deep hover:border-accent/40'
                } cursor-pointer`}
              >
                {on ? '✓ ' : ''}{g.name}
              </button>
            )
          })}
          {(games ?? []).length === 0 && <span className="text-sm text-text-muted">游戏库还是空的，先去添加几款游戏吧</span>}
        </div>
      </div>

      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        className="input"
        placeholder="备注（可选）：上分、娱乐、几点集合…"
      />

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={busy}>发车！</Button>
        <Button variant="ghost" onClick={onDone}>算了</Button>
      </div>
    </div>
  )
}

export default function RidesPage() {
  const { user } = useAuthStore()
  const { currentId } = useCircleStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const admin = isCircleAdmin()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['rides', currentId] })
  useRealtime('rides', '*', refresh, !!currentId)
  useRealtime('ride_members', '*', refresh, !!currentId)

  const { data: rides, isLoading } = useQuery({
    queryKey: ['rides', currentId],
    queryFn: () => getRides(currentId!),
    enabled: !!currentId,
  })

  const { data: games } = useQuery({
    queryKey: ['games', currentId],
    queryFn: () => getGames(currentId!),
    enabled: !!currentId,
  })

  const gameNames = useMemo(
    () => Object.fromEntries((games ?? []).map(g => [g.id, g.name])),
    [games],
  )

  const guard = async (fn: () => Promise<void>) => {
    setError('')
    setBusy(true)
    try {
      await fn()
      await queryClient.refetchQueries({ queryKey: ['rides', currentId] })
    } catch (err: any) {
      setError(err.message ?? '操作失败')
    } finally {
      setBusy(false)
    }
  }

  // 过期的开放车辆（司机忘了收/取消）沉到历史区，可在里面收尾
  const { open, history } = useMemo(() => {
    const all = rides ?? []
    return {
      open: all.filter(r => (r.status === 'recruiting' || r.status === 'driving') && !isExpired(r)),
      history: all
        .filter(r => r.status === 'ended' || r.status === 'cancelled' || isExpired(r))
        .slice(-8)
        .reverse(),
    }
  }, [rides])

  const grouped = useMemo(() => {
    const map = new Map<string, Ride[]>()
    for (const r of open) {
      const list = map.get(r.ride_date) ?? []
      list.push(r)
      map.set(r.ride_date, list)
    }
    return Array.from(map.entries())
  }, [open])

  const myActive = user
    ? open.some(r => r.driver_id === user.id || (r.ride_members ?? []).some(m => m.user_id === user.id))
    : false

  return (
    <div className="page-wrap [--page-cap:56rem]">
      <div className="mb-10 flex items-end justify-between gap-6 animate-fade-up">
        <div>
          <p className="eyebrow mb-3">Rides</p>
          <h1 className="text-4xl font-semibold tracking-tight">开黑车</h1>
          <p className="text-text-secondary text-base mt-2">选个时间段、带上想玩的游戏，发车喊人上车</p>
        </div>
        {!showForm && <Button onClick={() => setShowForm(true)} disabled={busy}>我要发车</Button>}
      </div>

      {error && <div className="px-4 py-2.5 rounded-lg bg-danger-dim text-danger text-sm mb-6">{error}</div>}

      {showForm && (
        <Card className="mb-8" eyebrow="New Ride" title="发一辆车">
          <CreateRideForm currentId={currentId!} busy={busy} guard={guard} onDone={() => setShowForm(false)} />
        </Card>
      )}

      {myActive && !showForm && (
        <p className="text-sm text-text-muted mb-6">你已经在一辆车上啦，等司机发车 🚗</p>
      )}

      <Card eyebrow="Open Rides" title="等车中" className="animate-fade-up">
        {isLoading ? (
          <p className="text-text-muted text-center py-6">加载中...</p>
        ) : grouped.length > 0 ? (
          <div className="flex flex-col gap-6">
            {grouped.map(([date, list]) => (
              <div key={date}>
                <p className="eyebrow mb-1">{fmtDate(date)} · {date.slice(5).replace('-', '/')}</p>
                <div className="divide-y divide-hairline">
                  {list.map(r => (
                    <RideCard key={r.id} ride={r} userId={user!.id} gameNames={gameNames} admin={admin} busy={busy} guard={guard} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base text-text-muted text-center py-6">
            还没有车 —— 点右上角「我要发车」，组一辆今晚的车
          </p>
        )}
      </Card>

      {history.length > 0 && (
        <Card eyebrow="History" title="过往班次" className="mt-8 animate-fade-up">
          <div className="divide-y divide-hairline">
            {history.map(r => (
              <RideCard key={r.id} ride={r} userId={user!.id} gameNames={gameNames} admin={admin} busy={busy} guard={guard} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
