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

  return (
    <div className="p-4 lg:p-10 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/votes')}
        className="text-[15px] text-text-secondary hover:text-text-primary mb-6 transition-colors flex items-center gap-1.5"
      >
        ← 返回投票列表
      </button>

      <Card>
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">{vote.title}</h1>
            <p className="text-[15px] text-text-muted mt-2">
              {vote.creator?.nickname} 发起 · {new Date(vote.created_at).toLocaleDateString('zh-CN')}
              {vote.expires_at && (
                <span className={isExpired ? 'text-danger' : ''}>
                  {' · 截止 '}{new Date(vote.expires_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {isExpired && ' (已过期)'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${
              vote.status === 'active'
                ? isExpired ? 'bg-danger-dim text-danger' : 'bg-success/15 text-success'
                : 'bg-bg-hover text-text-muted'
            }`}>
              {vote.status === 'active' ? isExpired ? '已过期' : '进行中' : '已结束'}
            </span>
            {vote.status === 'active' && user?.id === vote.creator_id && (
              <Button variant="danger" size="sm" onClick={handleClose}>结束投票</Button>
            )}
          </div>
        </div>

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
                    className="w-full text-left px-5 py-4 rounded-xl border border-border hover:border-accent hover:bg-accent-dim/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[15px] font-medium group-hover:text-accent transition-colors">{opt.text}</span>
                      <svg className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                  </button>
                ) : (
                  <div className={`px-5 py-4 rounded-xl border transition-colors ${
                    isMyVote ? 'border-accent bg-accent-dim/20' : 'border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-[15px] font-medium">{opt.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-text-muted">{count} 票</span>
                        <span className="text-[13px] font-medium text-text-secondary">{percent}%</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center px-5 pointer-events-none">
                      <div
                        className={`h-7 rounded-lg ${isMyVote ? 'bg-accent/15' : 'bg-bg-hover'}`}
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
          <div className="mt-8 pt-5 border-t border-border">
            <p className="text-[13px] text-text-muted mb-3">投票记录 ({records.length})</p>
            <div className="flex flex-wrap gap-2">
              {records.map(r => (
                <span key={r.id} className="px-3 py-1.5 rounded-lg bg-bg-hover text-[13px] text-text-secondary">
                  {r.user?.nickname ?? '未知'} → {vote.options[r.option_index]?.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
