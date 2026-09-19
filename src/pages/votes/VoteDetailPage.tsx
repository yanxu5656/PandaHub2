import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useRealtime } from '@/hooks/useRealtime'
import { getVoteById, submitVote, closeVote } from '@/lib/services'

export default function VoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: vote, isLoading, refetch } = useQuery({
    queryKey: ['vote', id],
    queryFn: () => getVoteById(id!),
    enabled: !!id,
  })

  useRealtime('vote_records', 'INSERT', (payload) => {
    if (payload.new?.vote_id === id) {
      queryClient.invalidateQueries({ queryKey: ['vote', id] })
      queryClient.invalidateQueries({ queryKey: ['votes'] })
    }
  })

  useRealtime('votes', 'UPDATE', (payload) => {
    if (payload.new?.id === id) {
      queryClient.invalidateQueries({ queryKey: ['vote', id] })
      queryClient.invalidateQueries({ queryKey: ['votes'] })
    }
  })

  const handleVote = async (optionIndex: number) => {
    if (!user || !id) return
    await submitVote(id, optionIndex)
    refetch()
  }

  const handleClose = async () => {
    if (!id) return
    await closeVote(id)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="p-10 text-center text-text-muted text-base">加载中...</div>
    )
  }

  if (!vote) {
    return (
      <div className="p-10 text-center text-text-muted text-base">投票不存在</div>
    )
  }

  const records = vote.records ?? []
  const totalVotes = records.length
  const myRecord = records.find(r => r.user_id === user?.id)
  const isExpired = vote.expires_at && new Date(vote.expires_at) < new Date() && vote.status === 'active'

  const optionCounts = vote.options.map((_, i) => records.filter(r => r.option_index === i).length)

  const statusStyle = vote.status === 'active'
    ? isExpired
      ? { label: '已过期', cls: 'bg-danger-dim text-danger' }
      : { label: '进行中', cls: 'bg-success/12 text-success' }
    : { label: '已结束', cls: 'bg-bg-hover text-text-muted' }

  return (
    <div className="page-wrap [--page-cap:48rem]">
      <button
        onClick={() => navigate('/votes')}
        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] text-text-secondary surface hover:text-text-primary hover:border-accent/25 transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回投票列表
      </button>

      <div className="animate-fade-up">
      <Card>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="eyebrow mb-3">Vote · {totalVotes} responses</p>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">{vote.title}</h1>
            <p className="text-[15px] text-text-muted mt-3">
              {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
              {vote.expires_at && (
                <span className={isExpired ? 'text-danger' : ''}>
                  {' · 截止 '}{new Date(vote.expires_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {isExpired && ' (已过期)'}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusStyle.cls}`}>{statusStyle.label}</span>
            {vote.status === 'active' && user?.id === vote.creator_id && (
              <Button variant="danger" size="sm" onClick={handleClose}>结束投票</Button>
            )}
          </div>
        </div>

        <div className="hairline my-6" />

        <div className="space-y-3">
          {vote.options.map((opt, i) => {
            const count = optionCounts[i]
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isMyVote = myRecord?.option_index === i
            const isVotable = vote.status === 'active' && !myRecord && !isExpired

            return (
              <div key={i} className="relative">
                {isVotable ? (
                  <button
                    onClick={() => handleVote(i)}
                    className="w-full cursor-pointer text-left px-5 py-4 rounded-xl border border-hairline bg-bg-elevated/40 hover:border-accent/50 hover:bg-accent-dim/40 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[15px] font-medium group-hover:text-accent-deep transition-colors">{opt.text}</span>
                      <svg className="w-5 h-5 text-text-muted group-hover:text-accent-deep transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8.5 12.5l2.5 2.5 5-6" strokeLinecap="round" strokeLinejoin="round" opacity="0" className="group-hover:opacity-100 transition-opacity" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className={`px-5 py-4 rounded-xl border transition-colors ${
                    isMyVote ? 'border-accent/50 bg-accent-dim/30' : 'border-hairline bg-bg-elevated/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className={`text-[15px] font-medium ${isMyVote ? 'text-accent-deep' : ''}`}>
                        {opt.text}
                        {isMyVote && <span className="text-xs ml-2 font-normal opacity-80">← 你的选择</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-text-muted num">{count} 票</span>
                        <span className="text-[13px] font-semibold text-text-secondary num">{percent}%</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center px-5 pointer-events-none">
                      <div
                        className={`h-7 rounded-lg ${isMyVote ? 'bg-linear-to-r from-accent/25 to-accent/10' : 'bg-bg-hover'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {myRecord && (
          <p className="text-[13px] text-text-muted mt-5">
            你投了「{vote.options[myRecord.option_index]?.text}」
          </p>
        )}

        {records.length > 0 && (
          <div className="mt-8 pt-6">
            <p className="eyebrow mb-4">投票记录 · {records.length}</p>
            <div className="flex flex-wrap gap-2">
              {records.map(r => (
                <span key={r.id} className="px-3 py-1.5 rounded-lg bg-bg-hover/70 border border-hairline text-[13px] text-text-secondary">
                  {r.user?.nickname ?? '未知'} <span className="text-text-muted">→</span> {vote.options[r.option_index]?.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  )
}
