import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import { useAuthStore } from '@/stores/authStore'
import {
  getAllSchedules,
  getSchedule,
  upsertSchedule,
  getWeekStart,
} from '@/lib/services'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08:00 - 23:00
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

export default function SchedulePage() {
  const { user } = useAuthStore()
  const [weekOffset, setWeekOffset] = useState(0)

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

  const { data: mySchedule } = useQuery({
    queryKey: ['my-schedule', weekStart, user?.id],
    queryFn: () => (user ? getSchedule(user.id, weekStart) : null),
    enabled: !!user,
  })

  const mySlots = mySchedule?.slots ?? {}

  // Count how many people are free at each slot
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

  const toggleSlot = async (day: number, hour: number) => {
    if (!user) return
    const key = getSlotKey(day, hour)
    const newSlots = { ...mySlots, [key]: !mySlots[key] }
    await upsertSchedule(user.id, weekStart, newSlots)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isWeekend = (day: number) => day >= 5

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">时间协调</h1>
        <p className="text-text-secondary text-sm mt-1">点击格子标记你的空闲时间，绿色越深表示越多人在这个时间段有空</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:bg-bg-hover transition-colors"
        >
          ← 上周
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-accent-dim text-accent hover:bg-accent/20 transition-colors"
        >
          本周
        </button>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          className="px-3 py-1.5 rounded-md border border-border text-sm text-text-secondary hover:bg-bg-hover transition-colors"
        >
          下周 →
        </button>
        <span className="ml-2 text-sm text-text-secondary">
          {weekDates[0].label} — {weekDates[6].label}
        </span>
      </div>

      <Card className="overflow-hidden !p-0">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted text-sm">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="w-16 px-3 py-3 text-xs font-medium text-text-muted border-b border-border bg-bg-secondary text-left sticky left-0 z-10">
                    时间
                  </th>
                  {DAY_NAMES.map((name, i) => (
                    <th
                      key={i}
                      className={`px-2 py-3 text-xs font-medium border-b border-border bg-bg-secondary text-center ${
                        isWeekend(i) ? 'text-accent' : ''
                      } ${isToday(weekDates[i].date) ? 'bg-accent-dim' : ''}`}
                    >
                      <div>{name}</div>
                      <div className="text-text-muted font-normal mt-0.5">{weekDates[i].label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour}>
                    <td className="px-3 py-1 text-xs text-text-muted border-b border-border/50 bg-bg-secondary sticky left-0 z-10 font-mono">
                      {String(hour).padStart(2, '0')}:00
                    </td>
                    {DAY_NAMES.map((_, day) => {
                      const key = getSlotKey(day, hour)
                      const isMine = !!mySlots[key]
                      const count = overlapCount[key] ?? 0
                      const intensity = totalMembers > 0 ? count / totalMembers : 0

                      let bgClass = 'bg-bg-card'
                      if (isMine) {
                        if (intensity >= 0.75) bgClass = 'bg-success/30'
                        else if (intensity >= 0.5) bgClass = 'bg-success/20'
                        else if (intensity >= 0.25) bgClass = 'bg-success/12'
                        else bgClass = 'bg-success/8'
                      }

                      return (
                        <td key={day} className="border-b border-border/50 p-0.5">
                          <button
                            onClick={() => toggleSlot(day, hour)}
                            className={`w-full h-9 rounded transition-all duration-150 ${bgClass} ${
                              isMine
                                ? 'hover:bg-success/40 ring-1 ring-success/30'
                                : 'hover:bg-bg-hover'
                            }`}
                            title={`${DAY_NAMES[day]} ${hour}:00 — ${isMine ? '有空' : '没空'}${count > 0 ? `，${count} 人有空` : ''}`}
                          />
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
      <div className="flex items-center gap-4 mt-4 text-xs text-text-muted">
        <span>点击格子切换空闲状态</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/8" /> 仅我有空
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/20" /> 多人有空
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success/30" /> 大部分人有空
        </span>
      </div>
    </div>
  )
}
