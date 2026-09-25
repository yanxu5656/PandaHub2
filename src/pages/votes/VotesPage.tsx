import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PandaFace from '@/components/ui/PandaFace'
import { useCircleStore, isCircleAdmin } from '@/stores/circleStore'
import { getVotes, createVote, deleteVote, getGames, type Vote } from '@/lib/services'

const filters = [
  { key: 'active', label: '进行中' },
  { key: 'closed', label: '已结束' },
  { key: 'all', label: '全部' },
] as const

export default function VotesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')
  const currentId = useCircleStore(s => s.currentId)

  const { data: votes, isLoading, refetch } = useQuery({
    queryKey: ['votes', currentId, filter],
    queryFn: () => (filter === 'all' ? getVotes(currentId!) : getVotes(currentId!, filter)),
    enabled: !!currentId,
  })

  return (
    <div className="page-wrap [--page-cap:56rem]">
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <p className="eyebrow mb-3">Votes</p>
          <h1 className="text-4xl font-semibold tracking-tight">投票</h1>
          <p className="text-text-secondary text-base mt-2">发起和参与投票</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '取消' : '+ 发起投票'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="surface rounded-xl p-1.5 flex gap-1 w-fit mb-8 animate-fade-up" style={{ animationDelay: '80ms' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-6 py-2.5 rounded-lg text-[15px] font-medium transition-all cursor-pointer ${
              filter === f.key ? 'bg-accent-dim text-accent-deep' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && <CreateForm onCreated={() => { setShowCreate(false); refetch() }} />}

      {/* Vote list */}
      {isLoading ? (
        <p className="text-text-muted text-sm text-center py-8">加载中...</p>
      ) : votes && votes.length > 0 ? (
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '140ms' }}>
          {votes.map(v => (
            <VoteRow key={v.id} vote={v} />
          ))}
        </div>
      ) : (
        <div className="surface rounded-xl py-14 text-center">
          <div className="inline-block opacity-70 mb-3">
            <PandaFace size={56} />
          </div>
          <p className="font-display text-2xl italic text-text-muted">Nothing yet</p>
          <p className="text-text-muted text-sm mt-2">还没有{filter === 'active' ? '进行中的' : filter === 'closed' ? '已结束的' : ''}投票</p>
        </div>
      )}
    </div>
  )
}

function VoteRow({ vote }: { vote: Vote }) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState('')
  const admin = isCircleAdmin()
  const totalVotes = vote.records?.length ?? 0
  const isExpired = vote.expires_at && new Date(vote.expires_at) < new Date() && vote.status === 'active'

  const statusStyle = vote.status === 'active'
    ? isExpired
      ? { label: '已过期', cls: 'bg-danger-dim text-danger' }
      : { label: '进行中', cls: 'bg-success/12 text-success' }
    : { label: '已结束', cls: 'bg-bg-hover text-text-muted' }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`确定删除投票「${vote.title}」？`)) return
    setDeleting(true)
    setDelError('')
    try {
      await deleteVote(vote.id)
      queryClient.invalidateQueries({ queryKey: ['votes'] })
    } catch (err: any) {
      setDelError(err?.message ?? '删除失败')
      setTimeout(() => setDelError(''), 4000)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Link
      to={`/votes/${vote.id}`}
      className="block surface rounded-xl p-7 hover:border-accent/25 hover:bg-bg-elevated/60 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight group-hover:text-accent-deep transition-colors truncate">{vote.title}</h3>
          <p className="text-sm text-text-muted mt-1.5">
            {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
            {vote.expires_at && (
              <span className={isExpired ? 'text-danger ml-2' : 'ml-2'}>
                · 截止 {new Date(vote.expires_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {isExpired && ' (已过期)'}
              </span>
            )}
          </p>
          {delError && <p className="text-sm text-danger mt-2">{delError}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${statusStyle.cls}`}>
            {vote.status === 'active' && !isExpired && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
            {statusStyle.label}
          </span>
          <span className="text-sm text-text-secondary num"><span className="font-display text-lg text-accent-deep not-italic">{totalVotes}</span> 票</span>
          {admin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="删除投票"
              title="删除投票"
              className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {vote.options.map((opt, i) => (
          <span key={i} className="px-3 py-1.5 rounded-lg bg-bg-hover/70 border border-hairline text-sm text-text-secondary">
            {opt.text}
          </span>
        ))}
      </div>
    </Link>
  )
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const currentId = useCircleStore(s => s.currentId)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: games } = useQuery({
    queryKey: ['games', currentId],
    queryFn: () => getGames(currentId!),
    enabled: !!currentId,
  })

  const addOption = () => setOptions(prev => [...prev, ''])
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i))
  const updateOption = (i: number, val: string) => setOptions(prev => prev.map((v, idx) => idx === i ? val : v))

  // 从游戏库点选：优先填入第一个空选项，否则追加
  const gameNames = Array.from(new Set((games ?? []).map(g => g.name)))
  const usedNames = new Set(options.map(o => o.trim()))
  const pickGame = (name: string) => {
    if (usedNames.has(name)) return
    setOptions(prev => {
      const i = prev.findIndex(o => !o.trim())
      if (i === -1) return [...prev, name]
      return prev.map((o, idx) => (idx === i ? name : o))
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter(o => o.trim())
    if (!title.trim() || validOptions.length < 2) {
      setError('请填写标题和至少两个选项')
      return
    }
    setLoading(true)
    setError('')
    try {
      const expires = expiresAt ? new Date(expiresAt).toISOString() : undefined
      await createVote(currentId!, title.trim(), validOptions, expires)
      setTitle('')
      setOptions(['', ''])
      setExpiresAt('')
      onCreated()
    } catch (err: any) {
      setError(err.message ?? '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6 animate-fade-up" eyebrow="New Vote" title="发起投票">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="px-4 py-2.5 rounded-lg bg-danger-dim text-danger text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-text-secondary mb-2">标题</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input"
            placeholder="例如：周末玩什么？"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">选项</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="font-display italic text-text-muted w-5 text-center shrink-0">{i + 1}</span>
                <input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  className="input flex-1"
                  placeholder={`选项 ${i + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    aria-label={`删除选项 ${i + 1}`}
                    className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="5" y1="5" x2="19" y2="19" /><line x1="19" y1="5" x2="5" y2="19" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="text-sm text-accent-deep hover:text-accent-deep mt-3 transition-colors cursor-pointer">
            + 添加选项
          </button>

          {gameNames.length > 0 && (
            <div className="mt-4 pt-4 border-t border-hairline">
              <p className="text-sm text-text-muted mb-2.5">从游戏库快速选择：</p>
              <div className="flex flex-wrap gap-2">
                {gameNames.map(name => {
                  const used = usedNames.has(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pickGame(name)}
                      disabled={used}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        used
                          ? 'bg-accent-dim border-accent/30 text-accent-deep cursor-default'
                          : 'bg-bg-elevated/60 border-hairline text-text-secondary hover:text-accent-deep hover:border-accent/40 hover:bg-accent-dim cursor-pointer'
                      }`}
                    >
                      {used ? `✓ ${name}` : name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">截止时间 <span className="text-text-muted">(可选)</span></label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="input"
          />
          <div className="flex gap-2 mt-2.5">
            {[
              { label: '1小时', hours: 1 },
              { label: '24小时', hours: 24 },
              { label: '3天', hours: 72 },
              { label: '7天', hours: 168 },
            ].map(preset => (
              <button
                key={preset.hours}
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + preset.hours * 3600000)
                  const pad = (n: number) => String(n).padStart(2, '0')
                  setExpiresAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
                }}
                className="px-3 py-1.5 rounded-lg text-xs bg-bg-hover text-text-secondary hover:text-accent-deep hover:bg-accent-dim transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? '创建中...' : '发起投票'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
