const comingSoonGames = [
  { name: '井字棋', en: 'Tic-Tac-Toe', desc: '经典三子棋' },
  { name: '五子棋', en: 'Gomoku', desc: '连成五子获胜' },
  { name: '你画我猜', en: 'Pictionary', desc: '画画猜词游戏' },
]

export default function MiniGamesPage() {
  return (
    <div className="page-wrap [--page-cap:56rem]">
      <div className="mb-10 animate-fade-up">
        <p className="eyebrow mb-3">Arcade</p>
        <h1 className="text-4xl font-semibold tracking-tight">小游戏</h1>
        <p className="text-text-secondary text-base mt-2">和朋友一起玩</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 gap-6">
        {comingSoonGames.map((game, i) => (
          <div
            key={game.name}
            className="surface rounded-xl p-8 text-center opacity-70 hover:opacity-100 transition-opacity animate-fade-up"
            style={{ animationDelay: `${100 + i * 80}ms` }}
          >
            <div className="w-14 h-14 rounded-2xl border border-hairline bg-bg-elevated/70 flex items-center justify-center mx-auto mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
            </div>
            <p className="font-display italic text-sm text-accent/70 mb-1">{game.en}</p>
            <h3 className="text-base font-semibold">{game.name}</h3>
            <p className="text-sm text-text-muted mt-2">{game.desc}</p>
            <span className="inline-block mt-5 px-3 py-1.5 rounded-lg text-xs border border-hairline bg-bg-hover/70 text-text-muted">
              即将推出
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
