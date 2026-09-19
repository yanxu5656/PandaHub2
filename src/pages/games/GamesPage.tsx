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

function GameCard({
  game,
  currentUserId,
  onRefresh,
}: {
  game: Game
  currentUserId: string | undefined
  onRefresh: () => void
}) {
  const [imgError, setImgError] = useState(false)
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

  const coverUrl = game.cover_url && !imgError ? game.cover_url : null

  return (
    <div className="surface rounded-xl overflow-hidden group hover:border-accent/25 transition-colors">
      <div className="relative h-40 bg-bg-secondary overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={game.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-bg-elevated to-bg-secondary">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-muted">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
            </svg>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#131317] to-transparent pointer-events-none" />
        {isOwner && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-medium bg-black/60 backdrop-blur text-accent border border-accent/30">
            已拥有
          </span>
        )}
      </div>

      <div className="p-5 pt-3">
        <h3 className="text-base font-semibold truncate tracking-tight">{game.name}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-text-muted">{game.platform}</span>
          {game.genres.map(g => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-md bg-bg-hover/70 border border-hairline text-text-secondary">{g}</span>
          ))}
        </div>

        {game.owners && game.owners.length > 0 && (
          <div className="mt-4 pt-4 border-t border-hairline">
            <p className="eyebrow mb-2.5">
              <span className="num text-text-secondary">{game.owners.length}</span> 人拥有
            </p>
            <div className="flex flex-wrap gap-1.5">
              {game.owners.map((owner: Profile) => (
                <span key={owner.id} className="text-sm px-2.5 py-1 rounded-lg bg-bg-hover/70 border border-hairline text-text-secondary">
                  {owner.nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {isOwner ? (
            <button
              onClick={handleUnclaim}
              className="flex-1 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium bg-accent-dim text-accent border border-accent/25 hover:bg-accent/20 transition-colors"
            >
              取消拥有
            </button>
          ) : (
            <button
              onClick={handleClaim}
              className="flex-1 cursor-pointer px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated/70 border border-hairline text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
            >
              我也有
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
            title="删除"
            aria-label={`删除 ${game.name}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function AddGameForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [steamAppId, setSteamAppId] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const appId = steamAppId.trim() ? parseInt(steamAppId.trim(), 10) : undefined
      const cover = coverUrl.trim() || (appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : undefined)
      await addGame(name.trim(), appId, cover)
      setName('')
      setSteamAppId('')
      setCoverUrl('')
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
            placeholder="例如：Elden Ring"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Steam App ID</label>
            <input
              value={steamAppId}
              onChange={e => setSteamAppId(e.target.value.replace(/\D/g, ''))}
              className="input"
              placeholder="例如：1245620"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">封面 URL</label>
            <input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className="input"
              placeholder="可选，留空则用 Steam 默认封面"
            />
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
      acc['其他'] = [...(acc['其他'] ?? []), game]
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
          <p className="text-text-secondary text-base mt-2">添加和管理你们的游戏</p>
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
