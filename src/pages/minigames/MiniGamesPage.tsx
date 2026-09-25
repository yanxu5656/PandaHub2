import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import { useCircleStore, isCircleAdmin } from '@/stores/circleStore'
import { useRealtime } from '@/hooks/useRealtime'
import TicTacToeBoard from '@/components/games/TicTacToeBoard'
import GomokuBoard from '@/components/games/GomokuBoard'
import {
  getGameSessions,
  createGameSession,
  updateGameSession,
  deleteGameSession,
  type GameSession,
} from '@/lib/services'
import { tttResult, gomokuResult } from '@/lib/games'

const KIND_META = {
  tictactoe: { label: '井字棋', en: 'Tic-Tac-Toe', desc: '三连即胜 · 3×3' },
  gomoku: { label: '五子棋', en: 'Gomoku', desc: '五连即胜 · 15×15' },
} as const

function nameOf(s: GameSession, role: 'creator' | 'opponent'): string {
  return s[role]?.nickname ?? '对方'
}

function StatusBadge({ s }: { s: GameSession }) {
  const map = {
    waiting: { label: '等待对手', cls: 'bg-accent-dim text-accent-deep' },
    playing: { label: '进行中', cls: 'bg-success/12 text-success' },
    done: { label: '已结束', cls: 'bg-bg-hover text-text-muted' },
    cancelled: { label: '已取消', cls: 'bg-bg-hover text-text-muted' },
  } as const
  const b = map[s.status]
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${b.cls}`}>{b.label}</span>
}

function SessionRow({
  s,
  userId,
  busy,
  canDelete,
  onOpen,
  onJoin,
  onCancel,
  onDelete,
}: {
  s: GameSession
  userId: string
  busy: boolean
  canDelete: boolean
  onOpen: () => void
  onJoin: () => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const isMine = s.creator_id === userId || s.opponent_id === userId
  return (
    <div className="flex items-center gap-4 py-4 border-b border-hairline last:border-0 group">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left cursor-pointer">
        <p className="text-[15px] font-semibold truncate group-hover:text-accent-deep transition-colors">
          {KIND_META[s.kind].label}
          {isMine && <span className="text-text-muted ml-2 text-sm font-normal">(我)</span>}
        </p>
        <p className="text-sm text-text-muted mt-0.5 truncate">
          {nameOf(s, 'creator')}
          {' vs '}
          {s.opponent_id ? nameOf(s, 'opponent') : '?'}
        </p>
      </button>
      <StatusBadge s={s} />
      {s.status === 'waiting' && s.creator_id !== userId && (
        <Button size="sm" onClick={onJoin} disabled={busy}>加入</Button>
      )}
      {s.status === 'waiting' && s.creator_id === userId && (
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>取消</Button>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          disabled={busy}
          title="删除对局"
          aria-label="删除对局"
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  )
}

function GameView({
  session,
  userId,
  busy,
  guard,
  onBack,
}: {
  session: GameSession
  userId: string
  busy: boolean
  guard: (fn: () => Promise<void>) => Promise<void>
  onBack: () => void
}) {
  const isCreator = session.creator_id === userId
  const isPlayer = isCreator || session.opponent_id === userId
  const piece = session.kind === 'tictactoe' ? (isCreator ? 'X' : 'O') : isCreator ? 'b' : 'w'
  const opponentId = isCreator ? session.opponent_id : session.creator_id
  const myTurn = session.status === 'playing' && session.turn_user_id === userId

  const handleMove = (key: string) => {
    if (busy || !myTurn || session.board[key] || !opponentId) return
    guard(async () => {
      const board = { ...session.board, [key]: piece }
      const result =
        (session.kind === 'tictactoe' ? tttResult(board) : gomokuResult(board, key)) ??
        // 五子棋满盘无胜者 = 平局，防止无子可下卡死
        (session.kind === 'gomoku' && Object.keys(board).length >= 225 ? 'draw' : null)
      if (result) {
        await updateGameSession(session.id, {
          board,
          status: 'done',
          winner_id: result === 'draw' ? null : userId,
        })
      } else {
        await updateGameSession(session.id, { board, turn_user_id: opponentId })
      }
    })
  }

  const join = () =>
    guard(async () => {
      await updateGameSession(session.id, {
        opponent_id: userId,
        status: 'playing',
        turn_user_id: session.creator_id,
      })
    })

  const cancel = () =>
    guard(async () => {
      await updateGameSession(session.id, { status: 'cancelled' })
    })

  const meta = KIND_META[session.kind]
  const winner = session.winner_id
    ? session.creator_id === session.winner_id
      ? nameOf(session, 'creator')
      : nameOf(session, 'opponent')
    : null

  let statusLine: string
  if (session.status === 'waiting') statusLine = '等待对手加入…'
  else if (session.status === 'cancelled') statusLine = '对局已取消'
  else if (session.status === 'done') statusLine = winner ? `「${winner}」获胜 🎉` : '平局'
  else statusLine = myTurn ? '轮到你了，落子！' : `等待 ${isCreator ? nameOf(session, 'opponent') : nameOf(session, 'creator')} 落子…`

  return (
    <div className="animate-fade-up">
      <button
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] text-text-secondary surface hover:text-text-primary hover:border-accent/25 transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回游戏大厅
      </button>

      <Card eyebrow={meta.en} title={meta.label}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <p className={`text-base font-medium ${myTurn ? 'text-accent-deep' : 'text-text-secondary'}`}>{statusLine}</p>
            <div className="flex items-center gap-2 shrink-0">
              {session.status === 'waiting' && session.creator_id !== userId && (
                <Button size="sm" onClick={join} disabled={busy}>加入对局</Button>
              )}
              {session.status === 'waiting' && isCreator && (
                <Button size="sm" variant="secondary" onClick={cancel} disabled={busy}>取消</Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
            <span className={`px-3 py-1.5 rounded-lg border ${isCreator ? 'border-accent/40 bg-accent-dim text-accent-deep font-medium' : 'border-hairline bg-bg-elevated/50'}`}>
              {nameOf(session, 'creator')}（{session.kind === 'tictactoe' ? 'X' : '黑'}·先手）
            </span>
            <span className="text-text-muted">vs</span>
            <span className={`px-3 py-1.5 rounded-lg border ${!isCreator && session.opponent_id ? 'border-accent/40 bg-accent-dim text-accent-deep font-medium' : 'border-hairline bg-bg-elevated/50'}`}>
              {session.opponent_id ? `${nameOf(session, 'opponent')}（${session.kind === 'tictactoe' ? 'O' : '白'}·后手）` : '等待加入'}
            </span>
          </div>

          {session.kind === 'tictactoe' ? (
            <TicTacToeBoard board={session.board} interactive={myTurn} onMove={i => handleMove(String(i))} />
          ) : (
            <GomokuBoard board={session.board} interactive={myTurn} myColor={piece as 'b' | 'w'} onMove={handleMove} />
          )}

          {!isPlayer && session.status === 'playing' && (
            <p className="text-sm text-text-muted text-center">观战中 —— 只有对局双方可以落子</p>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function MiniGamesPage() {
  const { user } = useAuthStore()
  const currentId = useCircleStore(s => s.currentId)
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useRealtime('game_sessions', '*', () => {
    queryClient.invalidateQueries({ queryKey: ['game-sessions', currentId] })
  })

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['game-sessions', currentId],
    queryFn: () => getGameSessions(currentId!),
    enabled: !!currentId,
  })

  const guard = async (fn: () => Promise<void>) => {
    setError('')
    setBusy(true)
    try {
      await fn()
      // 写操作后强制刷新到拿到最新状态再解除 busy，
      // 关闭 realtime 回传前的双击连走/陈旧视图窗口
      await queryClient.refetchQueries({ queryKey: ['game-sessions', currentId] })
    } catch (err: any) {
      setError(err.message ?? '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const create = (kind: GameSession['kind']) =>
    guard(async () => {
      const s = await createGameSession(currentId!, kind)
      setActiveId(s.id)
    })

  const active = activeId ? sessions?.find(s => s.id === activeId) : undefined

  const admin = isCircleAdmin()
  const handleDelete = (s: GameSession) =>
    guard(async () => {
      await deleteGameSession(s.id)
      if (activeId === s.id) setActiveId(null)
    })

  const open = (sessions ?? []).filter(s => s.status === 'waiting' || s.status === 'playing')
  const history = (sessions ?? []).filter(s => s.status === 'done' || s.status === 'cancelled').slice(0, 8)

  return (
    <div className="page-wrap [--page-cap:64rem]">
      <div className="mb-10 animate-fade-up">
        <p className="eyebrow mb-3">Arcade</p>
        <h1 className="text-4xl font-semibold tracking-tight">小游戏</h1>
        <p className="text-text-secondary text-base mt-2">和朋友实时对战，开一局吧</p>
      </div>

      {active && user ? (
        <GameView session={active} userId={user.id} busy={busy} guard={guard} onBack={() => setActiveId(null)} />
      ) : (
        <>
          {error && <div className="px-4 py-2.5 rounded-lg bg-danger-dim text-danger text-sm mb-6">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10 animate-fade-up" style={{ animationDelay: '60ms' }}>
            {(Object.keys(KIND_META) as GameSession['kind'][]).map(kind => (
              <Card key={kind}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display italic text-xs text-accent-deep/80">{KIND_META[kind].en}</p>
                    <h3 className="text-lg font-bold mt-1">{KIND_META[kind].label}</h3>
                    <p className="text-sm text-text-muted mt-1">{KIND_META[kind].desc}</p>
                  </div>
                  <Button onClick={() => create(kind)} disabled={busy}>开一局</Button>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mb-8 animate-fade-up" eyebrow="Open Games" title="进行中的对局">
            {isLoading ? (
              <p className="text-text-muted text-center py-6">加载中...</p>
            ) : open.length > 0 ? (
              <div className="divide-y divide-hairline">
                {open.map(s => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    userId={user!.id}
                    busy={busy}
                    canDelete={admin}
                    onOpen={() => setActiveId(s.id)}
                    onJoin={() => guard(async () => {
                      await updateGameSession(s.id, { opponent_id: user!.id, status: 'playing', turn_user_id: s.creator_id })
                      setActiveId(s.id)
                    })}
                    onCancel={() => guard(async () => {
                      await updateGameSession(s.id, { status: 'cancelled' })
                    })}
                    onDelete={() => {
                      if (window.confirm('确定删除这场对局？')) handleDelete(s)
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-base text-text-muted text-center py-6">还没有对局 —— 点上面的「开一局」邀请朋友</p>
            )}
          </Card>

          {history.length > 0 && (
            <Card className="animate-fade-up" eyebrow="History" title="最近结束">
              <div className="divide-y divide-hairline">
                {history.map(s => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    userId={user!.id}
                    busy={busy}
                    canDelete={admin}
                    onOpen={() => setActiveId(s.id)}
                    onJoin={() => {}}
                    onCancel={() => {}}
                    onDelete={() => {
                      if (window.confirm('确定删除这场对局？')) handleDelete(s)
                    }}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
