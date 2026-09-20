import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import PandaFace from '@/components/ui/PandaFace'
import { useAuthStore } from '@/stores/authStore'
import {
  getGames,
  addGame,
  updateGame,
  deleteGame,
  claimGame,
  unclaimGame,
  type Game,
  type Profile,
} from '@/lib/services'

const PRESET_GENRES = ['动作', '射击', '角色扮演', '策略', '模拟', '竞速', '恐怖', '合作派对', '沙盒建造', '卡牌桌游', '解谜', '格斗']

/** 拥有者简称：取前两个字即可区分 */
function ownerShort(nickname: string): string {
  return nickname.length <= 2 ? nickname : nickname.slice(0, 2)
}

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
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(game.name)
  const [genres, setGenres] = useState<string[]>(game.genres)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleGenre = (g: string) =>
    setGenres(prev => (prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]))

  const handleSave = async () => {
    if (!name.trim()) {
      setError('名称不能为空')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateGame(game.id, { name: name.trim(), genres })
      onRefresh()
      setEditing(false)
    } catch (err: any) {
      setError(err.message ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(game.name)
    setGenres(game.genres)
    setError('')
    setEditing(false)
  }

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

  if (editing) {
    const allGenres = [...PRESET_GENRES, ...genres.filter(g => !PRESET_GENRES.includes(g))]
    return (
      <div className="surface w-72 shrink-0 snap-start rounded-xl p-5 flex flex-col gap-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="input !text-base !py-2"
          placeholder="游戏名称"
        />
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {allGenres.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGenre(g)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                genres.includes(g)
                  ? 'bg-accent-dim text-accent-deep border border-accent/40 font-medium'
                  : 'bg-bg-elevated/60 border border-hairline text-text-secondary hover:text-text-primary'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中…' : '保存'}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCancel} className="flex-1">
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="surface w-72 shrink-0 snap-start rounded-xl p-5 flex flex-col gap-4 hover:border-accent/25 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold tracking-tight leading-snug line-clamp-2 min-w-0">{game.name}</h3>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent-deep hover:bg-accent-dim transition-colors cursor-pointer"
            title="编辑"
            aria-label={`编辑 ${game.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-colors cursor-pointer"
            title="删除"
            aria-label={`删除 ${game.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {game.genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {game.genres.map(g => (
            <span key={g} className="text-[13px] px-2.5 py-1 rounded-lg bg-accent-dim text-accent-deep font-medium">{g}</span>
          ))}
        </div>
      )}

      <div className="flex-1">
        {game.owners && game.owners.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {game.owners.map((owner: Profile) => (
              <span
                key={owner.id}
                title={owner.nickname}
                className={`text-[11px] leading-none px-1.5 py-1 rounded-md border ${
                  owner.id === currentUserId
                    ? 'bg-accent-dim border-accent/30 text-accent-deep font-medium'
                    : 'bg-bg-hover/70 border-hairline text-text-muted'
                }`}
              >
                {ownerShort(owner.nickname)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">还没有人拥有</p>
        )}
      </div>

      {isOwner ? (
        <button
          onClick={handleUnclaim}
          className="cursor-pointer w-full px-4 py-2 rounded-lg text-sm font-medium bg-accent-dim text-accent-deep border border-accent/25 hover:bg-accent/20 transition-colors"
        >
          已拥有 · 取消
        </button>
      ) : (
        <button
          onClick={handleClaim}
          className="cursor-pointer w-full px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated/70 border border-hairline text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
        >
          我也有
        </button>
      )}
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
                      ? 'bg-accent-dim text-accent-deep border border-accent/40 font-medium'
                      : 'bg-bg-elevated/60 border border-hairline text-text-secondary hover:text-text-primary hover:border-border-light'
                  }`}
                >
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
    <div className="page-wrap">
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

      <section className="animate-fade-up" style={{ animationDelay: '80ms' }}>
        {isLoading ? (
          <p className="text-text-muted text-base text-center py-10">加载中...</p>
        ) : Object.keys(genreGroups).length > 0 ? (
          <div className="space-y-10">
            {Object.entries(genreGroups).map(([genre, genreGames]) => (
              <div key={genre}>
                <h3 className="eyebrow mb-4">
                  {genre} <span className="num">({genreGames.length})</span>
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-1">
                  {genreGames.map(g => (
                    <GameCard key={g.id} game={g} currentUserId={user?.id} onRefresh={refetch} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface rounded-xl py-14 text-center">
            <div className="inline-block opacity-70 mb-3">
              <PandaFace size={56} />
            </div>
            <p className="font-display text-2xl italic text-text-muted">Empty shelf</p>
            <p className="text-text-muted text-sm mt-2">暂无游戏，添加一个吧</p>
          </div>
        )}
      </section>
    </div>
  )
}
