import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import {
  getAllSchedules,
  getAllProfiles,
  upsertSchedule,
  getWeekStart,
  type Profile,
  type Schedule,
} from '@/lib/services'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8)
const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getSlotKey(day: number, hour: number): string {
  return `${day}-${hour}`
}

function getSlotAvatars(
  slotKey: string,
  schedules: Schedule[],
  profiles: Profile[],
  currentUserId: string | undefined,
): { nickname: string; avatar: string; isMe: boolean }[] {
  const available: { nickname: string; avatar: string; isMe: boolean }[] = []
  for (const s of schedules) {
    if (s.slots[slotKey]) {
      const profile = profiles.find(p => p.id === s.user_id)
      if (profile) {
        available.push({
          nickname: profile.nickname,
          avatar: profile.avatar_url ?? profile.nickname.slice(0, 1),
          isMe: s.user_id === currentUserId,
        })
      }
    }
  }
  return available
}

export default function SchedulePage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<'add' | 'remove' | null>(null)
  const dragGridRef = useRef<HTMLDivElement>(null)

  const weekStart = useMemo(() => {
    const base = new Date()
    base.setDate(base.getDate() + weekOffset * 7)
    return getWeekStart(base)
  }, [weekOffset])

  const weekDates = useMemo(() => {
    const start = new Date(weekStart + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i)
      return { date: d, label: formatDate(d) }
    })
  }, [weekStart])

  const { data: allSchedules, isLoading } = useQuery({
    queryKey: ['schedules', weekStart],
    queryFn: () => getAllSchedules(weekStart),
  })

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: getAllProfiles,
  })

  const { data: mySchedule } = useQuery({
    queryKey: ['my-schedule', weekStart, user?.id],
    queryFn: () => (user ? getAllSchedules(weekStart).then(s => s.find(sch => sch.user_id === user.id) ?? null) : null),
    enabled: !!user,
  })

  const mySlots = mySchedule?.slots ?? {}

  const overlapCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of allSchedules ?? []) {
      for (const [key, val] of Object.entries(s.slots)) {
        if (val) counts[key] = (counts[key] ?? 0) + 1
      }
    }
    return counts
  }, [allSchedules])

  const totalMembers = allSchedules?.length ?? 0

  const handleSlotAction = useCallback(async (day: number, hour: number, forceState?: boolean) => {
    if (!user) return
    const key = getSlotKey(day, hour)
    const newState = forceState !== undefined ? forceState : !mySlots[key]
    const newSlots = { ...mySlots, [key]: newState }
    try {
      await upsertSchedule(user.id, weekStart, newSlots)
      queryClient.invalidateQueries({ queryKey: ['schedules', weekStart] })
      queryClient.invalidateQueries({ queryKey: ['my-schedule', weekStart] })
    } catch (err) {
      console.error('Failed to update schedule:', err)
    }
  }, [user, mySlots, weekStart, queryClient])

  const handleMouseDown = (day: number, hour: number) => {
    const key = getSlotKey(day, hour)
    const willAdd = !mySlots[key]
    setIsDragging(true)
    setDragMode(willAdd ? 'add' : 'remove')
    handleSlotAction(day, hour, willAdd)
  }

  const handleMouseEnter = (day: number, hour: number) => {
    if (!isDragging || !dragMode) return
    const key = getSlotKey(day, hour)
    const shouldAdd = dragMode === 'add' && !mySlots[key]
    const shouldRemove = dragMode === 'remove' && mySlots[key]
    if (shouldAdd || shouldRemove) {
      handleSlotAction(day, hour, dragMode === 'add')
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragMode(null)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isWeekend = (day: number) => day >= 5

  // Find best times for group play (3+ people available)
  const bestTimes = useMemo(() => {
    const times: { day: number; hour: number; count: number; people: string[] }[] = []
    for (const [key, count] of Object.entries(overlapCount)) {
      if (count >= 2) {
        const [dayStr, hourStr] = key.split('-')
        const day = parseInt(dayStr)
        const hour = parseInt(hourStr)
        const people = getSlotAvatars(key, allSchedules ?? [], profiles ?? [], user?.id)
          .map(p => p.nickname)
        times.push({ day, hour, count, people })
      }
    }
    times.sort((a, b) => b.count - a.count)
    return times.slice(0, 10)
  }, [overlapCount, allSchedules, profiles, user?.id])

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">时间协调</h1>
        <p className="text-text-secondary text-base mt-2">拖拽选择多个时间段，绿色越深表示越多人在这个时间段有空</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="px-5 py-2.5 rounded-xl border border-border text-[15px] text-text-secondary hover:bg-bg-hover transition-colors"
        >
          ← 上周
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className="px-5 py-2.5 rounded-xl text-[15px] font-medium bg-accent-dim text-accent hover:bg-accent/20 transition-colors"
        >
          本周
        </button>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="px-5 py-2.5 rounded-xl border border-border text-[15px] text-text-secondary hover:bg-bg-hover transition-colors"
        >
          下周 →
        </button>
        <span className="ml-3 text-base text-text-secondary">
          {weekDates[0].label} — {weekDates[6].label}
        </span>
      </div>

      <Card className="overflow-hidden !p-0">
        {isLoading ? (
          <div className="p-10 text-center text-text-muted text-base">加载中...</div>
        ) : (
          <div className="overflow-x-auto" ref={dragGridRef}>
            <table className="w-full border-collapse min-w-[700px] select-none">
              <thead>
                <tr>
                  <th className="w-20 px-4 py-4 text-sm font-medium text-text-muted border-b border-border bg-bg-secondary text-left sticky left-0 z-10">
                    时间
                  </th>
                  {DAY_NAMES.map((name, i) => (
                    <th
                      key={i}
                      className={`px-3 py-4 text-sm font-medium border-b border-border bg-bg-secondary text-center ${
                        isWeekend(i) ? 'text-accent' : ''
                      } ${isToday(weekDates[i].date) ? 'bg-accent-dim' : ''}`}
                    >
                      <div>{name}</div>
                      <div className="text-text-muted font-normal mt-1 text-xs">{weekDates[i].label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td className="px-4 py-2 text-sm text-text-muted border-b border-border/50 bg-bg-secondary sticky left-0 z-10 font-mono">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {DAY_NAMES.map((_, day) => {
                      const key = getSlotKey(day, hour)
                      const isMine = !!mySlots[key]
                      const count = overlapCount[key] ?? 0
                      const intensity = totalMembers > 0 ? count / totalMembers : 0
                      const avatars = getSlotAvatars(key, allSchedules ?? [], profiles ?? [], user?.id)

                      let bgClass = 'bg-bg-card'
                      if (isMine) {
                        if (intensity >= 0.75) bgClass = 'bg-success/30'
                        else if (intensity >= 0.5) bgClass = 'bg-success/20'
                        else if (intensity >= 0.25) bgClass = 'bg-success/12'
                        else bgClass = 'bg-success/8'
                      }

                      return (
                        <td key={day} className="border-b border-border/50 p-1">
                          <button
                            onMouseDown={() => handleMouseDown(day, hour)}
                            onMouseEnter={() => handleMouseEnter(day, hour)}
                            className={`w-full h-12 rounded-lg transition-all duration-150 flex items-center justify-center gap-0.5 ${bgClass} ${
                              isMine
                                ? 'hover:bg-success/40 ring-1 ring-success/30'
                                : 'hover:bg-bg-hover'
                            }`}
                            title={`${DAY_NAMES[day]} ${hour}:00 — ${isMine ? '有空' : '没空'}${count > 0 ? `，${count} 人有空` : ''}`}
                          >
                            {avatars.length > 0 && avatars.length <= 3 && (
                              <span className="text-xs text-text-muted">
                                {avatars.map(a => a.avatar).join('')}
                              </span>
                            )}
                            {avatars.length > 3 && (
                              <span className="text-xs text-text-muted">
                                {avatars[0].avatar}+{avatars.length - 1}
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-6 text-sm text-text-muted">
        <span>拖拽选择多个时间段</span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-success/8" /> 仅我有空
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-success/20" /> 多人有空
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-success/30" /> 大部分人有空
        </span>
      </div>

      {/* Best times summary */}
      {bestTimes.length > 0 && (
        <Card className="mt-8">
          <h3 className="text-base font-semibold mb-4">推荐时间段 (2人以上有空)</h3>
          <div className="space-y-3">
            {bestTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                <span className="text-sm text-text-muted w-24">
                  {DAY_NAMES[t.day]} {String(t.hour).padStart(2, '0')}:00
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-2.5 rounded-full bg-success/20 flex-1 overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full"
                      style={{ width: `${(t.count / totalMembers) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-text-secondary w-20 text-right">
                  {t.count}/{totalMembers} 人
                </span>
                <div className="flex gap-1.5">
                  {t.people.slice(0, 5).map((name, j) => (
                    <span key={j} className="px-2.5 py-1 rounded-lg bg-bg-hover text-sm text-text-secondary">
                      {name}
                    </span>
                  ))}
                  {t.people.length > 5 && (
                    <span className="text-sm text-text-muted">+{t.people.length - 5}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
