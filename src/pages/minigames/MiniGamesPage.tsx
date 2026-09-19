import Card from '@/components/ui/Card'

const comingSoonGames = [
  { name: '井字棋', desc: '经典三子棋' },
  { name: '五子棋', desc: '连成五子获胜' },
  { name: '你画我猜', desc: '画画猜词游戏' },
]

export default function MiniGamesPage() {
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">小游戏</h1>
        <p className="text-text-secondary text-sm mt-1">和朋友一起玩</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comingSoonGames.map(game => (
          <Card key={game.name} className="opacity-60">
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold">{game.name}</h3>
              <p className="text-xs text-text-muted mt-1">{game.desc}</p>
              <span className="inline-block mt-3 px-2.5 py-1 rounded text-xs bg-bg-hover text-text-muted">
                即将推出
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
