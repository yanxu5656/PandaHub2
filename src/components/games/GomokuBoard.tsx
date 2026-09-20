const N = 15

export default function GomokuBoard({
  board,
  interactive,
  myColor,
  onMove,
}: {
  board: Record<string, string>
  interactive: boolean
  myColor: 'b' | 'w'
  onMove: (key: string) => void
}) {
  return (
    <div
      className="grid grid-cols-[repeat(15,minmax(0,1fr))] w-full max-w-[520px] mx-auto rounded-xl overflow-hidden border border-hairline bg-[#f2f0e9]"
      role="grid"
      aria-label="五子棋棋盘"
    >
      {Array.from({ length: N * N }, (_, idx) => {
        const x = idx % N
        const y = Math.floor(idx / N)
        const key = `${x},${y}`
        const v = board[key]
        const clickable = interactive && !v
        return (
          <button
            key={key}
            onClick={() => clickable && onMove(key)}
            disabled={!clickable}
            aria-label={`第 ${y + 1} 行第 ${x + 1} 列${v ? '：已落子' : ''}`}
            className={`aspect-square flex items-center justify-center group ${clickable ? 'cursor-pointer' : ''}`}
          >
            {v ? (
              <span
                className={`w-[82%] h-[82%] rounded-full ${
                  v === 'b' ? 'bg-[#3a3640]' : 'bg-white ring-1 ring-[#d5d1c4]'
                }`}
              />
            ) : (
              clickable && (
                <span
                  className={`w-[82%] h-[82%] rounded-full opacity-0 group-hover:opacity-35 transition-opacity ${
                    myColor === 'b' ? 'bg-[#3a3640]' : 'bg-white ring-1 ring-[#d5d1c4]'
                  }`}
                />
              )
            )}
          </button>
        )
      })}
    </div>
  )
}
