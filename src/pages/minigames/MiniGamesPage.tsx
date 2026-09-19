import Card from '@/components/ui/Card'

const comingSoonGames = [
  { name: '井字棋', desc: '经典三子棋' },
  { name: '五子棋', desc: '连成五子获胜' },
  { name: '你画我猜', desc: '画画猜词游戏' },
]

export default function MiniGamesPage() {
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold">小游戏</h1>
        <p className="text-text-secondary text-base mt-2">和朋友一起玩</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {comingSoonGames.map(game => (
          <Card key={game.name} className="opacity-60">
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-bg-hover flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
              </div>
              <h3 className="text-base font-semibold">{game.name}</h3>
              <p className="text-sm text-text-muted mt-2">{game.desc}</p>
              <span className="inline-block mt-4 px-3 py-1.5 rounded-lg text-sm bg-bg-hover text-text-muted">
                即将推出
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
