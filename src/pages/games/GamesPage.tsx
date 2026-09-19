import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'
import {
  getGames,
  addGame,
  deleteGame,
  claimGame,
  unclaimGame,
  type Game,
  type Profile,
} from '@/lib/services'

const PRESET_GENRES = ['动作', '射击', '角色扮演', '策略', '模拟', '竞速', '恐怖', '合作派对', '沙盒建造', '卡牌桌游', '解谜', '格斗']

function GameCard({
  game,
  currentUserId,
  onRefresh,
}: {
  game: Game
  currentUserId: string | undefined
  onRefresh: () => void
}) {
  const isOwner = game.owners?.some(o => o.id === currentUserId) ?? false

  const handleClaim = async () => {
    await claimGame(game.id)
    onRefresh()
  }

  const handleUnclaim = async () => {
    await unclaimGame(game.id)
    onRefresh()
  }

  const handleDelete = async () => {
    if (!confirm('确定删除这个游戏？')) return
    await deleteGame(game.id)
    onRefresh()
  }

  return (
    <div className="surface rounded-xl p-6 flex flex-col gap-5 hover:border-accent/25 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl border border-accent/25 bg-accent-dim flex items-center justify-center shrink-0">
          <span className="font-display italic text-xl gold-text">{(game.name || '?').slice(0, 1).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight truncate">{game.name}</h3>
          <p className="text-xs text-text-muted mt-1">{game.platform}</p>
        </div>
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer shrink-0"
          title="删除"
          aria-label={`删除 ${game.name}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {game.genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {game.genres.map(g => (
            <span key={g} className="text-xs px-2.5 py-1 rounded-lg bg-bg-hover/70 border border-hairline text-text-secondary">{g}</span>
          ))}
        </div>
      )}

      <div className="flex-1">
        {game.owners && game.owners.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {game.owners.map((owner: Profile) => (
              <span key={owner.id} className="text-sm px-2.5 py-1 rounded-lg bg-bg-hover/70 border border-hairline text-text-secondary">
                {owner.nickname}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">还没有人拥有</p>
        )}
      </div>

      <div className="flex gap-2">
        {isOwner ? (
          <button
            onClick={handleUnclaim}
            className="flex-1 cursor-pointer px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-dim text-accent border border-accent/25 hover:bg-accent/20 transition-colors"
          >
            已拥有 · 取消
          </button>
        ) : (
          <button
            onClick={handleClaim}
            className="flex-1 cursor-pointer px-4 py-2.5 rounded-lg text-sm font-medium bg-bg-elevated/70 border border-hairline text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
          >
            我也有
          </button>
        )}
      </div>
    </div>
  )
}

function AddGameForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [customGenre, setCustomGenre] = useState('')
  const [extraGenres, setExtraGenres] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allGenres = [...PRESET_GENRES, ...extraGenres]

  const toggleGenre = (g: string) =>
    setGenres(prev => (prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]))

  const addCustomGenre = () => {
    const g = customGenre.trim()
    if (!g || allGenres.includes(g)) return
    setExtraGenres(prev => [...prev, g])
    setGenres(prev => [...prev, g])
    setCustomGenre('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await addGame(name.trim(), undefined, undefined, genres)
      setName('')
      setGenres([])
      onAdded()
    } catch (err: any) {
      setError(err.message ?? '添加失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-8 animate-fade-up" eyebrow="New Game" title="添加游戏">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="px-4 py-2.5 rounded-lg bg-danger-dim text-danger text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-text-secondary mb-2">游戏名称 *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="例如：双人成行"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-2">
            分类 <span className="text-text-muted">（可多选，已选 {genres.length} 个）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {allGenres.map(g => {
              const selected = genres.includes(g)
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                    selected
                      ? 'bg-accent-dim text-accent border border-accent/40 font-medium'
                      : 'bg-bg-elevated/60 border border-hairline text-text-secondary hover:text-text-primary hover:border-border-light'
                  }`}
                >
                  {selected && (
                    <svg className="inline w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {g}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={customGenre}
              onChange={e => setCustomGenre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomGenre() } }}
              className="input flex-1 max-w-60"
              placeholder="自定义分类…"
            />
            <Button type="button" variant="secondary" onClick={addCustomGenre} disabled={!customGenre.trim()}>
              + 添加分类
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={loading}>
            {loading ? '添加中...' : '添加游戏'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function GamesPage() {
  const { user } = useAuthStore()
  const [showAdd, setShowAdd] = useState(false)

  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['games'],
    queryFn: getGames,
  })

  const sharedGames = games?.filter(g => (g.owner_count ?? 0) >= 2) ?? []
  const allGames = games ?? []

  const genreGroups = allGames.reduce<Record<string, Game[]>>((acc, game) => {
    if (game.genres.length === 0) {
      acc['未分类'] = [...(acc['未分类'] ?? []), game]
    } else {
      for (const genre of game.genres) {
        acc[genre] = [...(acc[genre] ?? []), game]
      }
    }
    return acc
  }, {})

  return (
    <div className="p-6 lg:p-12 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-10 animate-fade-up">
        <div>
          <p className="eyebrow mb-3">Game Library</p>
          <h1 className="text-4xl font-semibold tracking-tight">游戏库</h1>
          <p className="text-text-secondary text-base mt-2">添加和管理你们的游戏，按分类浏览</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加游戏'}
        </Button>
      </div>

      {showAdd && <AddGameForm onAdded={() => { setShowAdd(false); refetch() }} />}

      {sharedGames.length > 0 && (
        <section className="mb-12 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <h2 className="text-base font-semibold mb-5 flex items-center gap-3">
            <span className="w-1 h-5 rounded-full bg-linear-to-b from-accent-hover to-accent-deep" />
            多人共有的游戏
            <span className="font-display italic text-text-muted text-sm">{sharedGames.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sharedGames.map(g => (
              <GameCard key={g.id} game={g} currentUserId={user?.id} onRefresh={refetch} />
            ))}
          </div>
        </section>
      )}

      <section className="animate-fade-up" style={{ animationDelay: '140ms' }}>
        <h2 className="text-base font-semibold mb-5 flex items-center gap-3">
          <span className="w-1 h-5 rounded-full bg-linear-to-b from-accent-hover to-accent-deep" />
          全部游戏
        </h2>
        {isLoading ? (
          <p className="text-text-muted text-base text-center py-10">加载中...</p>
        ) : Object.keys(genreGroups).length > 0 ? (
          <div className="space-y-10">
            {Object.entries(genreGroups).map(([genre, genreGames]) => (
              <div key={genre}>
                <h3 className="eyebrow mb-4">{genre} <span className="num">({genreGames.length})</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {genreGames.map(g => (
                    <GameCard key={g.id} game={g} currentUserId={user?.id} onRefresh={refetch} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface rounded-xl py-14 text-center">
            <p className="font-display text-2xl italic text-text-muted">Empty shelf</p>
            <p className="text-text-muted text-sm mt-2">暂无游戏，添加一个吧</p>
          </div>
        )}
      </section>
    </div>
  )
}
