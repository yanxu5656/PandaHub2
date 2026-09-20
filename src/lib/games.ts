// 小游戏纯逻辑：胜负判定

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export function tttResult(board: Record<string, string>): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of TTT_LINES) {
    const v = board[a]
    if (v && v === board[b] && v === board[c]) return v as 'X' | 'O'
  }
  return Object.keys(board).length >= 9 ? 'draw' : null
}

/** 五子棋：只需检查最后落子处是否成五 */
export function gomokuResult(board: Record<string, string>, lastKey: string): 'b' | 'w' | null {
  const color = board[lastKey]
  if (!color) return null
  const [x, y] = lastKey.split(',').map(Number)
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dx, dy] of dirs) {
    let count = 1
    for (const sign of [1, -1]) {
      let nx = x + dx * sign
      let ny = y + dy * sign
      while (board[`${nx},${ny}`] === color) {
        count++
        nx += dx * sign
        ny += dy * sign
      }
    }
    if (count >= 5) return color as 'b' | 'w'
  }
  return null
}
