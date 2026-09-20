export default function TicTacToeBoard({
  board,
  interactive,
  onMove,
}: {
  board: Record<string, string>
  interactive: boolean
  onMove: (cell: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-72 sm:w-80 mx-auto">
      {Array.from({ length: 9 }, (_, i) => {
        const v = board[i]
        const clickable = interactive && !v
        return (
          <button
            key={i}
            onClick={() => clickable && onMove(i)}
            disabled={!clickable}
            aria-label={`格子 ${i + 1}${v ? `：${v}` : '：空'}`}
            className={`aspect-square rounded-2xl surface flex items-center justify-center text-5xl font-display font-bold transition-all ${
              v === 'X' ? 'text-accent-deep' : v === 'O' ? 'text-blush-deep' : ''
            } ${clickable ? 'cursor-pointer hover:bg-accent-dim/60' : ''}`}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}
