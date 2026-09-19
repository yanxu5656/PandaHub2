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
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden hover:border-border-light transition-colors">
      <div className="h-32 bg-bg-secondary flex items-center justify-center overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-text-muted">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
          </svg>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold truncate">{game.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-muted">{game.platform}</span>
          {game.genres.map(g => (
            <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-bg-hover text-text-secondary">{g}</span>
          ))}
        </div>

        {game.owners && game.owners.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-text-muted mb-1.5">
              {game.owners.length} 人拥有：
            </p>
            <div className="flex flex-wrap gap-1">
              {game.owners.map((owner: Profile) => (
                <span key={owner.id} className="text-xs px-2 py-0.5 rounded bg-bg-hover text-text-secondary">
                  {owner.nickname}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {isOwner ? (
            <button
              onClick={handleUnclaim}
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-success/15 text-success hover:bg-success/25 transition-colors"
            >
              取消拥有
            </button>
          ) : (
            <button
              onClick={handleClaim}
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              我也有
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 rounded text-xs text-text-muted hover:text-danger transition-colors"
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <div className="px-4 py-2 rounded bg-danger-dim text-danger text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-text-secondary mb-1.5">游戏名称 *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            placeholder="例如：Elden Ring"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Steam App ID</label>
            <input
              value={steamAppId}
              onChange={e => setSteamAppId(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="例如：1245620"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">封面 URL</label>
            <input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="可选，留空则用 Steam 默认封面"
            />
          </div>
        </div>

        <div className="flex justify-end">
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">游戏库</h1>
          <p className="text-text-secondary text-sm mt-1">添加和管理你们的游戏</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加游戏'}
        </Button>
      </div>

      {showAdd && <AddGameForm onAdded={() => { setShowAdd(false); refetch() }} />}

      {sharedGames.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            多人拥有的游戏
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sharedGames.map(g => (
              <GameCard key={g.id} game={g} currentUserId={user?.id} onRefresh={refetch} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          全部游戏
        </h2>
        {isLoading ? (
          <p className="text-text-muted text-sm text-center py-8">加载中...</p>
        ) : Object.keys(genreGroups).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(genreGroups).map(([genre, genreGames]) => (
              <div key={genre}>
                <h3 className="text-xs font-medium text-text-muted mb-3">{genre} ({genreGames.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {genreGames.map(g => (
                    <GameCard key={g.id} game={g} currentUserId={user?.id} onRefresh={refetch} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">暂无游戏，添加一个吧</p>
        )}
      </section>
    </div>
  )
}
