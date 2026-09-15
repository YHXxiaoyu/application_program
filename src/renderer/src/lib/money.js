// 金额工具:金额一律以"分"为单位存储和计算,避免小数误差
export function yuanToCents(yuan) {
  const cents = Math.round(Number(yuan) * 100)
  return Number.isFinite(cents) ? cents : NaN
}

// 1250 -> '1,250.00'
export function formatCents(cents) {
  return (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
