import { useState, useMemo, useEffect, useRef } from 'react'
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
  const [dragMode, setDragMode] = useState<'add' | 'remove' | null>(null)
  const [draft, setDraft] = useState<Record<string, boolean> | null>(null)

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

  const serverSlots = useMemo(() => mySchedule?.slots ?? {}, [mySchedule])
  const mySlots = draft ?? serverSlots

  const draftRef = useRef<Record<string, boolean> | null>(null)
  const serverSlotsRef = useRef(serverSlots)
  const draggingRef = useRef(false)
  serverSlotsRef.current = serverSlots

  useEffect(() => {
    draftRef.current = null
    setDraft(null)
  }, [weekStart])

  const setDraftBoth = (next: Record<string, boolean> | null) => {
    draftRef.current = next
    setDraft(next)
  }

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
  const totalProfiles = profiles?.length ?? 0

  useEffect(() => {
    const onWindowMouseUp = async () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setDragMode(null)
      const d = draftRef.current
      if (!user || !d) return
      try {
        await upsertSchedule(user.id, weekStart, d)
        queryClient.setQueryData<Schedule | null>(['my-schedule', weekStart, user.id], old =>
          old ? { ...old, slots: d } : { id: crypto.randomUUID(), user_id: user.id, week_start: weekStart, slots: d, updated_at: new Date().toISOString() },
        )
        queryClient.invalidateQueries({ queryKey: ['schedules', weekStart] })
        queryClient.invalidateQueries({ queryKey: ['my-schedule', weekStart] })
      } catch (err) {
        console.error('Failed to update schedule:', err)
      } finally {
        setDraftBoth(null)
      }
    }
    window.addEventListener('mouseup', onWindowMouseUp)
    return () => window.removeEventListener('mouseup', onWindowMouseUp)
  }, [user, weekStart, queryClient])

  const handleMouseDown = (day: number, hour: number) => {
    if (!user) return
    const key = getSlotKey(day, hour)
    const base = draftRef.current ?? serverSlotsRef.current
    const willAdd = !base[key]
    draggingRef.current = true
    setDragMode(willAdd ? 'add' : 'remove')
    setDraftBoth({ ...base, [key]: willAdd })
  }

  const handleMouseEnter = (day: number, hour: number) => {
    if (!draggingRef.current || !dragMode) return
    const key = getSlotKey(day, hour)
    const cur = draftRef.current ?? serverSlotsRef.current
    if (!!cur[key] === (dragMode === 'add')) return
    setDraftBoth({ ...cur, [key]: dragMode === 'add' })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isWeekend = (day: number) => day >= 5

  // Find common times: 2+ people available, merge consecutive hours with same people
  const commonTimes = useMemo(() => {
    type Slot = { day: number; startHour: number; endHour: number; people: string[] }
    const merged: Slot[] = []
    for (let day = 0; day < 7; day++) {
      for (const hour of HOURS) {
        const key = getSlotKey(day, hour)
        if ((overlapCount[key] ?? 0) < 2) continue
        const people = getSlotAvatars(key, allSchedules ?? [], profiles ?? [], user?.id)
          .map(p => p.nickname)
          .sort()
        const last = merged[merged.length - 1]
        const sameAsLast =
          last && last.day === day && last.endHour === hour - 1 &&
          last.people.length === people.length &&
          last.people.every((n, i) => n === people[i])
        if (sameAsLast) last.endHour = hour
        else merged.push({ day, startHour: hour, endHour: hour, people })
      }
    }
    merged.sort((a, b) => b.people.length - a.people.length || a.day - b.day || a.startHour - b.startHour)
    return merged.slice(0, 8)
  }, [overlapCount, allSchedules, profiles, user?.id])

  return (
    <div className="page-wrap">
      <div className="mb-8 animate-fade-up">
        <p className="eyebrow mb-3">Schedule</p>
        <h1 className="text-4xl font-semibold tracking-tight">时间协调</h1>
        <p className="text-text-secondary text-base mt-2">拖拽选择多个时间段，金色越深表示越多人在这个时间段有空</p>
      </div>

      {/* Week navigation */}
      <div className="flex flex-wrap items-center gap-4 mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="surface rounded-xl p-1.5 flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="px-5 py-2.5 rounded-lg text-[15px] text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            ← 上周
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-5 py-2.5 rounded-lg text-[15px] font-medium bg-accent-dim text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          >
            本周
          </button>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="px-5 py-2.5 rounded-lg text-[15px] text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            下周 →
          </button>
        </div>
        <span className="ml-2 font-display text-xl italic text-text-secondary">
          <span className="gold-text not-italic num">{weekDates[0].label}</span>
          <span className="text-text-muted mx-2 not-italic">—</span>
          <span className="gold-text not-italic num">{weekDates[6].label}</span>
        </span>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '160ms' }}>
      <Card className="overflow-hidden !p-0">
        {isLoading ? (
          <div className="p-10 text-center text-text-muted text-base">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px] select-none">
              <thead>
                <tr>
                  <th className="w-20 px-4 py-4 text-xs font-medium tracking-widest uppercase text-text-muted border-b border-hairline bg-[#101014] text-left sticky left-0 z-10">
                    时间
                  </th>
                  {DAY_NAMES.map((name, i) => (
                    <th
                      key={i}
                      className={`px-3 py-4 text-sm font-medium border-b border-hairline bg-[#101014] text-center ${
                        isWeekend(i) ? 'text-accent' : 'text-text-secondary'
                      } ${isToday(weekDates[i].date) ? 'bg-accent-dim' : ''}`}
                    >
                      <div>{name}</div>
                      <div className="text-text-muted font-normal mt-1 text-xs num">{weekDates[i].label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td className="px-4 py-2 text-sm text-text-muted border-b border-hairline bg-[#101014] sticky left-0 z-10 num">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {DAY_NAMES.map((_, day) => {
                      const key = getSlotKey(day, hour)
                      const isMine = !!mySlots[key]
                      const count = overlapCount[key] ?? 0
                      const intensity = totalMembers > 0 ? count / totalMembers : 0
                      const avatars = getSlotAvatars(key, allSchedules ?? [], profiles ?? [], user?.id)

                      let bgClass = 'bg-bg-card/60'
                      if (isMine) {
                        if (intensity >= 0.75) bgClass = 'bg-accent/40'
                        else if (intensity >= 0.5) bgClass = 'bg-accent/28'
                        else if (intensity >= 0.25) bgClass = 'bg-accent/16'
                        else bgClass = 'bg-accent/8'
                      }

                      return (
                        <td key={day} className="border-b border-hairline p-1">
                          <button
                            onMouseDown={() => handleMouseDown(day, hour)}
                            onMouseOver={() => handleMouseEnter(day, hour)}
                            className={`w-full h-12 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-0.5 ${bgClass} ${
                              isMine
                                ? 'hover:brightness-125 ring-1 ring-accent/35'
                                : 'hover:bg-bg-hover'
                            }`}
                            title={`${DAY_NAMES[day]} ${hour}:00 — ${isMine ? '有空' : '没空'}${count > 0 ? `，${count} 人有空` : ''}`}
                          >
                            {avatars.length > 0 && avatars.length <= 3 && (
                              <span className={`text-xs ${isMine ? 'text-text-primary' : 'text-text-muted'}`}>
                                {avatars.map(a => a.avatar).join('')}
                              </span>
                            )}
                            {avatars.length > 3 && (
                              <span className={`text-xs ${isMine ? 'text-text-primary' : 'text-text-muted'}`}>
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
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-text-muted">
        <span>拖拽选择多个时间段</span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-accent/8 ring-1 ring-accent/20" /> 仅我有空
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-accent/28" /> 多人有空
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-accent/40" /> 大部分人有空
        </span>
      </div>

      {/* Common times summary */}
      <Card className="mt-8" eyebrow="Common Hours" title="大家能一起玩的时间">
        {commonTimes.length === 0 ? (
          <p className="text-base text-text-muted text-center py-6">
            还没有重叠的时间段 —— 在上方表格中点选或拖选你有空的时间后，这里会自动列出大家共同有空的时段
          </p>
        ) : (
          <div className="space-y-1">
            {commonTimes.map((t, i) => {
              const everyone = totalProfiles > 1 && t.people.length >= totalProfiles
              return (
                <div key={i} className="flex flex-wrap items-center gap-4 py-3.5 border-b border-hairline last:border-0">
                  <span className="text-[15px] font-medium w-36 shrink-0">
                    {DAY_NAMES[t.day]} <span className="num text-text-secondary">{String(t.startHour).padStart(2, '0')}:00–{String(t.endHour + 1).padStart(2, '0')}:00</span>
                  </span>
                  {everyone && (
                    <span className="px-2.5 py-1 rounded-lg text-xs bg-accent-dim text-accent font-medium shrink-0">全员可到</span>
                  )}
                  <div className="h-2 rounded-full bg-bg-hover flex-1 min-w-[80px] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-accent-deep to-accent-hover"
                      style={{ width: `${totalProfiles > 0 ? (t.people.length / totalProfiles) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-secondary w-16 text-right shrink-0 num">
                    {t.people.length}/{totalProfiles} 人
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {t.people.slice(0, 5).map((name, j) => (
                      <span key={j} className="px-2.5 py-1 rounded-lg bg-bg-hover/80 border border-hairline text-sm text-text-secondary">
                        {name}
                      </span>
                    ))}
                    {t.people.length > 5 && (
                      <span className="text-sm text-text-muted self-center">+{t.people.length - 5}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
