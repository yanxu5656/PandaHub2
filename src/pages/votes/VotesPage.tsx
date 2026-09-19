import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getVotes, createVote, type Vote } from '@/lib/services'

export default function VotesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'active' | 'closed' | 'all'>('active')

  const { data: votes, isLoading, refetch } = useQuery({
    queryKey: ['votes', filter],
    queryFn: () => (filter === 'all' ? getVotes() : getVotes(filter)),
  })

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">投票</h1>
          <p className="text-text-secondary text-base mt-2">发起和参与投票</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '取消' : '+ 发起投票'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-8 bg-bg-card border border-border rounded-xl p-1.5 w-fit">
        {(['active', 'closed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-[15px] font-medium transition-colors ${
              filter === f ? 'bg-accent-dim text-accent' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'active' ? '进行中' : f === 'closed' ? '已结束' : '全部'}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && <CreateForm onCreated={() => { setShowCreate(false); refetch() }} />}

      {/* Vote list */}
      {isLoading ? (
        <p className="text-text-muted text-sm text-center py-8">加载中...</p>
      ) : votes && votes.length > 0 ? (
        <div className="space-y-3">
          {votes.map(v => (
            <VoteRow key={v.id} vote={v} />
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm text-center py-8">暂无投票</p>
      )}
    </div>
  )
}

function VoteRow({ vote }: { vote: Vote }) {
  const totalVotes = vote.records?.length ?? 0
  const isExpired = vote.expires_at && new Date(vote.expires_at) < new Date() && vote.status === 'active'

  return (
    <Link
      to={`/votes/${vote.id}`}
      className="block bg-bg-card border border-border rounded-xl p-5 hover:border-border-light transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{vote.title}</h3>
          <p className="text-sm text-text-muted mt-1.5">
            {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
            {vote.expires_at && (
              <span className={isExpired ? 'text-danger ml-2' : 'ml-2'}>
                · 截止 {new Date(vote.expires_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {isExpired && ' (已过期)'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
            vote.status === 'active'
              ? isExpired ? 'bg-danger-dim text-danger' : 'bg-success/15 text-success'
              : 'bg-bg-hover text-text-muted'
          }`}>
            {vote.status === 'active' ? isExpired ? '已过期' : '进行中' : '已结束'}
          </span>
          <span className="text-sm text-text-muted">{totalVotes} 票</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {vote.options.map((opt, i) => (
          <span key={i} className="px-3 py-1.5 rounded-lg bg-bg-hover text-sm text-text-secondary">
            {opt.text}
          </span>
        ))}
      </div>
    </Link>
  )
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addOption = () => setOptions(prev => [...prev, ''])
  const removeOption = (i: number) => setOptions(prev => prev.filter((_, idx) => idx !== i))
  const updateOption = (i: number, val: string) => setOptions(prev => prev.map((v, idx) => idx === i ? val : v))

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
      await createVote(title.trim(), validOptions, expires)
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
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="px-4 py-2 rounded bg-danger-dim text-danger text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">标题</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="例如：周末玩什么？"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">选项</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                  placeholder={`选项 ${i + 1}`}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="px-2 text-text-muted hover:text-danger transition-colors">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="text-xs text-accent hover:text-accent-hover mt-2 transition-colors">
            + 添加选项
          </button>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">截止时间 <span className="text-text-muted">(可选)</span></label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <div className="flex gap-2 mt-2">
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
                className="px-2.5 py-1 rounded text-xs bg-bg-hover text-text-secondary hover:text-accent hover:bg-accent-dim/30 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? '创建中...' : '发起投票'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
