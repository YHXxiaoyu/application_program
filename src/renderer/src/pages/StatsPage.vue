<template>
  <div class="stats-page">
    <!-- 数字卡片 -->
    <div class="stat-tiles">
      <div class="card stat-tile">
        <p class="stat-label">今日支出</p>
        <p class="stat-value">¥{{ formatCents(overview.todayCents) }}</p>
      </div>
      <div class="card stat-tile">
        <p class="stat-label">本月支出</p>
        <p class="stat-value">¥{{ formatCents(overview.monthCents) }}</p>
      </div>
      <div class="card stat-tile">
        <p class="stat-label">本月日均</p>
        <p class="stat-value">¥{{ formatCents(overview.avgPerDayCents) }}</p>
      </div>
    </div>

    <template v-if="hasAnyData">
      <!-- 本月分类占比 -->
      <div class="card chart-card">
        <h3 class="card-title">本月分类占比</h3>
        <div class="pie-layout">
          <div class="pie-col">
            <div ref="pieRef" class="pie-box"></div>
            <div class="pie-legend">
              <span v-for="s in donutSlices" :key="s.name" class="legend-item">
                <span class="legend-dot" :style="{ background: s.itemStyle.color }"></span>{{ s.name }}
              </span>
            </div>
          </div>
          <div class="rank-list">
            <div
              v-for="r in parentStats"
              :key="r.parent_id"
              class="rank-row"
              :class="{ selected: drill && drill.parentId === r.parent_id }"
              @click="toggleDrill(r)"
            >
              <span class="rank-icon">{{ r.parent_icon }}</span>
              <span class="rank-name">{{ r.parent_name }}</span>
              <span class="rank-bar-track">
                <span class="rank-bar" :style="{ width: barPct(r.total_cents, parentMax) + '%', background: colorOf(r) }"></span>
              </span>
              <span class="rank-amount">¥{{ formatCents(r.total_cents) }}</span>
              <span class="rank-pct">{{ pctOfMonth(r.total_cents) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 二级明细(点击分类后出现) -->
      <div v-if="drill" class="card chart-card">
        <div class="card-title-row">
          <h3 class="card-title">{{ drill.title }} · 二级明细</h3>
          <button class="mini-btn" @click="drill = null">关闭</button>
        </div>
        <div class="rank-list">
          <div v-for="c in drill.items" :key="c.name" class="rank-row">
            <span class="rank-name sub-name">{{ c.name }}</span>
            <span class="rank-bar-track">
              <span class="rank-bar" :style="{ width: barPct(c.total_cents, drillMax) + '%' }"></span>
            </span>
            <span class="rank-amount">¥{{ formatCents(c.total_cents) }}</span>
            <span class="rank-pct">{{ pctOfDrill(c.total_cents) }}%</span>
          </div>
        </div>
      </div>

      <!-- 近 6 个月趋势 -->
      <div class="card chart-card">
        <h3 class="card-title">近 6 个月支出趋势</h3>
        <div ref="trendRef" class="trend-box"></div>
      </div>
    </template>

    <div v-else class="card empty-card">
      <p class="empty-icon">🐴</p>
      <p>还没有任何记账数据</p>
      <p class="empty-tip">去「记一笔」记录你的第一笔花销,统计图表会自动生成</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { formatCents } from '../lib/money'
import { currentMonth } from '../lib/date'

const props = defineProps({
  categories: { type: Array, default: () => [] }
})

// 图表配色:经过色盲安全校验的固定色板(浅色系配合名称列表使用)
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']
const FOLD_COLOR = '#898781' // 合并项(其他)用中性灰

const month = currentMonth()
const overview = reactive({ todayCents: 0, monthCents: 0, count: 0, avgPerDayCents: 0 })
const parentStats = ref([])
const trendData = ref([])
const drill = ref(null)

const pieRef = ref(null)
const trendRef = ref(null)
let pieChart = null
let trendChart = null

// 固定颜色:按分类顺序分配,与饼图一一对应(颜色跟着分类走,不跟着排名走)
const colorMap = computed(() => {
  const m = new Map()
  props.categories.forEach((p) => {
    const i = p.sort_order - 1
    if (i >= 0 && i < PALETTE.length) m.set(p.id, PALETTE[i])
  })
  return m
})

function colorOf(row) {
  return colorMap.value.get(row.parent_id) || FOLD_COLOR
}

function hasColor(row) {
  return colorMap.value.has(row.parent_id)
}

const hasAnyData = computed(
  () => parentStats.value.some((r) => r.total_cents > 0) || trendData.value.some((t) => t.total_cents > 0)
)

const parentMax = computed(() => Math.max(1, ...parentStats.value.map((r) => r.total_cents)))
const drillMax = computed(() => (drill.value ? Math.max(1, ...drill.value.items.map((c) => c.total_cents)) : 1))

function pctOfMonth(cents) {
  return overview.monthCents > 0 ? Math.round((cents / overview.monthCents) * 100) : 0
}

function pctOfDrill(cents) {
  return drill.value && drill.value.totalCents > 0
    ? Math.round((cents / drill.value.totalCents) * 100)
    : 0
}

function barPct(cents, max) {
  return Math.round((cents / max) * 100)
}

function monthShort(m) {
  return Number(m.split('-')[1]) + '月'
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

// 饼图:本月消费最多的大类 + 「其他」合并项
const donutSlices = computed(() => {
  const rows = parentStats.value.filter((r) => r.total_cents > 0)
  const colored = rows.filter(hasColor)
  const colorless = rows.filter((r) => !hasColor(r))
  const top = colored.slice(0, 7)
  const folded = [...colored.slice(7), ...colorless]
  const slices = top.map((r) => ({
    name: r.parent_name,
    value: r.total_cents / 100,
    raw: r,
    itemStyle: { color: colorOf(r) }
  }))
  if (folded.length) {
    slices.push({
      name: `其他(${folded.length}类)`,
      value: folded.reduce((s, r) => s + r.total_cents, 0) / 100,
      folded,
      itemStyle: { color: FOLD_COLOR }
    })
  }
  return slices
})

function pieTooltip(params) {
  const d = params.data
  const pct = params.percent + '%'
  if (d.folded) {
    const lines = d.folded
      .map((r) => `${esc(r.parent_icon)} ${esc(r.parent_name)}&nbsp;&nbsp;¥${formatCents(r.total_cents)}`)
      .join('<br/>')
    return `<div style="font-weight:600;margin-bottom:4px">${esc(d.name)}&nbsp;&nbsp;¥${formatCents(d.value * 100)}(${pct})</div>${lines}`
  }
  return `<span style="font-weight:600">${esc(d.name)}</span>&nbsp;&nbsp;¥${formatCents(d.value * 100)}(${pct})`
}

const pieOption = computed(() => ({
  textStyle: { fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" },
  tooltip: {
    trigger: 'item',
    formatter: pieTooltip,
    backgroundColor: '#fff',
    borderColor: '#e1e0d9',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#333', fontSize: 13 }
  },
  series: [
    {
      type: 'pie',
      radius: ['52%', '70%'],
      center: ['50%', '50%'],
      itemStyle: { borderColor: '#ffffff', borderWidth: 2, borderRadius: 4 },
      label: { show: false },
      emphasis: { scaleSize: 5 },
      data: donutSlices.value
    }
  ]
}))

const trendOption = computed(() => ({
  textStyle: { fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#e1e0d9',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#333', fontSize: 13 },
    formatter: (params) => {
      const p = params[0]
      return `${esc(p.name)}<br/><span style="font-weight:600">支出 ¥${formatCents(p.value * 100)}</span>`
    }
  },
  grid: { left: 8, right: 16, top: 28, bottom: 0, containLabel: true },
  xAxis: {
    type: 'category',
    data: trendData.value.map((t) => monthShort(t.month)),
    axisTick: { show: false },
    axisLine: { lineStyle: { color: '#c3c2b7' } },
    axisLabel: { color: '#898781', fontSize: 12 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#e1e0d9' } },
    axisLine: { show: false },
    axisLabel: {
      color: '#898781',
      fontSize: 12,
      formatter: (v) => v.toLocaleString('zh-CN')
    }
  },
  series: [
    {
      type: 'bar',
      data: trendData.value.map((t, i) => {
        const item = { value: t.total_cents / 100 }
        // 只在支出最高的那个月标注数字,其余靠坐标轴与悬浮提示
        if (i === maxTrendIndex.value) {
          item.label = {
            show: true,
            position: 'top',
            color: '#52514e',
            fontSize: 12,
            fontWeight: 600,
            formatter: (p) => '¥' + p.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
          }
        }
        return item
      }),
      barWidth: 20,
      itemStyle: { color: '#eda100', borderRadius: [4, 4, 0, 0] }
    }
  ]
}))

const maxTrendIndex = computed(() => {
  let idx = 0
  trendData.value.forEach((t, i) => {
    if (t.total_cents > trendData.value[idx].total_cents) idx = i
  })
  return idx
})

function onPieClick(params) {
  if (params.data.folded) {
    drill.value = {
      parentId: 0,
      title: '其他分类',
      totalCents: params.data.folded.reduce((s, r) => s + r.total_cents, 0),
      items: params.data.folded.map((r) => ({ name: r.parent_name, total_cents: r.total_cents }))
    }
  } else {
    drillInto(params.data.raw)
  }
}

async function drillInto(row) {
  const items = await window.heima.statsByChild(month, row.parent_id)
  drill.value = {
    parentId: row.parent_id,
    title: `${row.parent_icon} ${row.parent_name}`,
    totalCents: row.total_cents,
    items
  }
}

function toggleDrill(row) {
  if (drill.value && drill.value.parentId === row.parent_id) {
    drill.value = null
  } else {
    drillInto(row)
  }
}

async function loadAll() {
  const [ov, ps, td] = await Promise.all([
    window.heima.statsOverview(month),
    window.heima.statsByParent(month),
    window.heima.statsTrend()
  ])
  Object.assign(overview, ov)
  parentStats.value = ps
  trendData.value = td
}

function onResize() {
  if (pieChart) pieChart.resize()
  if (trendChart) trendChart.resize()
}

onMounted(async () => {
  await loadAll()
  await nextTick()
  if (pieRef.value) {
    pieChart = echarts.init(pieRef.value)
    pieChart.setOption(pieOption.value)
    pieChart.on('click', onPieClick)
  }
  if (trendRef.value) {
    trendChart = echarts.init(trendRef.value)
    trendChart.setOption(trendOption.value)
  }
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (pieChart) pieChart.dispose()
  if (trendChart) trendChart.dispose()
})
</script>

<style scoped>
.stats-page {
  max-width: 860px;
  margin: 0 auto;
}

/* 数字卡片 */
.stat-tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-tile {
  padding: 18px 22px;
}

.stat-label {
  font-size: 13px;
  color: #898781;
}

.stat-value {
  font-size: 26px;
  font-weight: 600;
  color: #333;
  margin-top: 6px;
}

/* 图表卡片 */
.chart-card {
  padding: 20px 24px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #444;
  margin-bottom: 8px;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title-row .card-title {
  margin-bottom: 0;
}

.mini-btn {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  padding: 3px 12px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.mini-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

/* 饼图 + 排行 */
.pie-layout {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pie-col {
  width: 340px;
  flex-shrink: 0;
}

.pie-box {
  width: 340px;
  height: 300px;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding: 4px 8px 0;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #52514e;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.rank-list {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.rank-row:hover {
  background: #f7f8fa;
}

.rank-row.selected {
  background: #fdf3e2;
}

.rank-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.rank-name {
  font-size: 13px;
  color: #333;
  width: 72px;
  flex-shrink: 0;
}

.sub-name {
  width: 100px;
  padding-left: 22px;
}

.rank-bar-track {
  flex: 1;
  height: 6px;
  background: #f0f1f4;
  border-radius: 3px;
  overflow: hidden;
}

.rank-bar {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: #eda100;
}

.rank-amount {
  font-size: 13px;
  color: #333;
  width: 90px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.rank-pct {
  font-size: 12px;
  color: #898781;
  width: 42px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* 趋势图 */
.trend-box {
  height: 240px;
}

/* 空状态 */
.empty-card {
  padding: 60px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.empty-icon {
  font-size: 44px;
  margin-bottom: 10px;
}

.empty-tip {
  font-size: 12px;
  color: #bbb;
  margin-top: 6px;
}
</style>
