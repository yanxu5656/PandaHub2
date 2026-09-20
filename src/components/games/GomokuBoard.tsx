const N = 15
const LINE = '#c8a06a'

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
      className="grid grid-cols-[repeat(15,minmax(0,1fr))] w-full max-w-[520px] mx-auto rounded-xl overflow-hidden border border-[#b98d52] bg-[#f3e0bd] shadow-[0_6px_24px_rgba(155,111,52,0.18)]"
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
            className={`relative aspect-square flex items-center justify-center group ${clickable ? 'cursor-pointer' : ''}`}
          >
            {/* 棋线：穿过每格中心，边缘格只画半段 */}
            <span
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                left: x === 0 ? '50%' : 0,
                right: x === N - 1 ? '50%' : 0,
                top: 'calc(50% - 0.5px)',
                height: 1,
                background: LINE,
              }}
            />
            <span
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                top: y === 0 ? '50%' : 0,
                bottom: y === N - 1 ? '50%' : 0,
                left: 'calc(50% - 0.5px)',
                width: 1,
                background: LINE,
              }}
            />
            {/* 天元与星位 */}
            {(x === 7 && y === 7) || ((x === 3 || x === 11) && (y === 3 || y === 11)) ? (
              !v && <span aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none" style={{ background: LINE }} />
            ) : null}
            {v ? (
              <span
                className={`relative w-[86%] h-[86%] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${
                  v === 'b'
                    ? 'bg-[radial-gradient(circle_at_35%_30%,#5a5560,#2f2b34)]'
                    : 'bg-[radial-gradient(circle_at_35%_30%,#ffffff,#e2ddd2)] ring-1 ring-[#c9b48b]/60'
                }`}
              />
            ) : (
              clickable && (
                <span
                  className={`relative w-[86%] h-[86%] rounded-full opacity-0 group-hover:opacity-35 transition-opacity ${
                    myColor === 'b' ? 'bg-[#2f2b34]' : 'bg-white ring-1 ring-[#c9b48b]'
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
