// 日期小工具(全部按本地时区处理)
function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function currentMonth() {
  return todayStr().slice(0, 7)
}

// '2026-09' -> '2026年9月'
export function monthLabel(month) {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

// 月份加减:'2026-09' + 1 -> '2026-10'
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// '2026-09-14' -> '今天 9月14日' / '昨天 9月13日' / '9月1日 周二'
export function dateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today - date) / 86400000)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  if (diff === 0) return `今天 ${m}月${d}日`
  if (diff === 1) return `昨天 ${m}月${d}日`
  return `${m}月${d}日 ${week}`
}
