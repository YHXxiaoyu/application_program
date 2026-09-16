<template>
  <div class="bills-page">
    <!-- 月份切换 + 合计 -->
    <div class="card summary-card">
      <div class="month-row">
        <button class="icon-btn" @click="changeMonth(-1)">‹</button>
        <span class="month-text">{{ monthLabel(month) }}</span>
        <button class="icon-btn" @click="changeMonth(1)">›</button>
      </div>
      <div class="summary-row">
        <div class="summary-item">
          <p class="summary-num">¥{{ formatCents(summary.totalCents) }}</p>
          <p class="summary-label">本月支出</p>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <p class="summary-num">{{ summary.count }}</p>
          <p class="summary-label">本月笔数</p>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-row">
      <input
        v-model="keyword"
        class="text-input search-input"
        placeholder="搜索备注或分类..."
        @input="load"
      />
      <select v-model="filterParentId" class="text-input filter-select" @change="load">
        <option :value="0">全部分类</option>
        <option v-for="p in categories" :key="p.id" :value="p.id">{{ p.icon }} {{ p.name }}</option>
      </select>
    </div>

    <!-- 账单列表(按天分组) -->
    <div v-if="groups.length" class="card list-card">
      <div v-for="g in groups" :key="g.date" class="day-group">
        <div class="day-header">
          <span>{{ dateLabel(g.date) }}</span>
          <span class="day-total">支出 ¥{{ formatCents(g.total) }}</span>
        </div>
        <div v-for="b in g.bills" :key="b.id" class="bill-row">
          <div class="bill-icon">{{ b.parent_icon }}</div>
          <div class="bill-main">
            <p class="bill-cat">{{ b.parent_name }} · {{ b.category_name }}</p>
            <p v-if="b.note" class="bill-sub">
              {{ b.note }}<span v-if="b.payment_method"> · {{ b.payment_method }}</span>
            </p>
            <p v-else-if="b.payment_method" class="bill-sub">{{ b.payment_method }}</p>
          </div>
          <div class="bill-right">
            <span class="bill-amount">-¥{{ formatCents(b.amount_cents) }}</span>
            <div class="bill-actions">
              <button class="mini-btn" @click="openEdit(b)">编辑</button>
              <button class="mini-btn danger" @click="askDelete(b)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="card empty-card">
      <p class="empty-icon">🐟</p>
      <p>本月还没有账单</p>
      <p class="empty-tip">去「记一笔」记录你的第一笔花销吧</p>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal">
        <div class="modal-head">
          <h3>编辑账单</h3>
          <button class="icon-btn" @click="editing = null">✕</button>
        </div>
        <BillForm
          :categories="categories"
          :initial="editing"
          submit-label="保存修改"
          show-cancel
          @submit="saveEdit"
          @cancel="editing = null"
        />
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleting" class="modal-mask" @click.self="deleting = null">
      <div class="modal modal-small">
        <h3 class="confirm-title">删除这笔账单?</h3>
        <p class="confirm-text">
          {{ deleting.parent_name }} · {{ deleting.category_name }}
          <strong>-¥{{ formatCents(deleting.amount_cents) }}</strong>
        </p>
        <p class="confirm-tip">删除后无法恢复</p>
        <div class="confirm-actions">
          <button class="btn ghost" @click="deleting = null">再想想</button>
          <button class="btn danger-solid" @click="doDelete">删除</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import BillForm from '../components/BillForm.vue'
import { currentMonth, shiftMonth, monthLabel, dateLabel } from '../lib/date'
import { formatCents } from '../lib/money'

defineProps({
  categories: { type: Array, default: () => [] }
})

const month = ref(currentMonth())
const bills = ref([])
const keyword = ref('')
const filterParentId = ref(0)
const summary = reactive({ totalCents: 0, count: 0 })
const editing = ref(null)
const deleting = ref(null)
const toast = ref('')

// 按日期分组
const groups = computed(() => {
  const map = new Map()
  for (const b of bills.value) {
    if (!map.has(b.date)) map.set(b.date, { date: b.date, bills: [], total: 0 })
    const g = map.get(b.date)
    g.bills.push(b)
    g.total += b.amount_cents
  }
  return [...map.values()]
})

async function load() {
  bills.value = await window.heima.listBills({
    month: month.value,
    keyword: keyword.value.trim(),
    categoryId: filterParentId.value
  })
  Object.assign(summary, await window.heima.monthSummary(month.value))
}

function changeMonth(delta) {
  month.value = shiftMonth(month.value, delta)
  load()
}

function openEdit(bill) {
  editing.value = bill
}

async function saveEdit(bill) {
  await window.heima.updateBill(editing.value.id, bill)
  editing.value = null
  showToast('✅ 已保存修改')
  load()
}

function askDelete(bill) {
  deleting.value = bill
}

async function doDelete() {
  await window.heima.deleteBill(deleting.value.id)
  deleting.value = null
  showToast('已删除')
  load()
}

function showToast(text) {
  toast.value = text
  setTimeout(() => (toast.value = ''), 2000)
}

onMounted(load)
</script>

<style scoped>
.bills-page {
  max-width: 860px;
  margin: 0 auto;
}

/* 月份 + 合计 */
.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  margin-bottom: 16px;
}

.month-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.month-text {
  font-size: 17px;
  font-weight: 600;
  min-width: 110px;
  text-align: center;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #f2f3f5;
  color: #555;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.icon-btn:hover {
  background: #e4e6eb;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 22px;
}

.summary-item {
  text-align: center;
}

.summary-num {
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
}

.summary-label {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.summary-divider {
  width: 1px;
  height: 32px;
  background: #e8eaee;
}

/* 筛选 */
.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
}

.filter-select {
  width: 170px;
}

/* 列表 */
.list-card {
  padding: 8px 24px;
}

.day-group {
  padding: 10px 0;
  border-bottom: 1px solid #f0f1f4;
}

.day-group:last-child {
  border-bottom: none;
}

.day-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #888;
  padding: 4px 0 8px;
}

.day-total {
  color: #aaa;
}

.bill-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.bill-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.bill-main {
  flex: 1;
  min-width: 0;
}

.bill-cat {
  font-size: 14px;
  color: #333;
}

.bill-sub {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.bill-amount {
  font-size: 15px;
  font-weight: 700;
  color: #333;
}

.bill-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.bill-row:hover .bill-actions {
  opacity: 1;
}

.mini-btn {
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.mini-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.mini-btn.danger:hover {
  border-color: #e5484d;
  color: #e5484d;
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

/* 弹窗 */
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-head h3 {
  font-size: 17px;
}

.modal-small {
  text-align: center;
}

.confirm-title {
  font-size: 17px;
  margin-bottom: 14px;
}

.confirm-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}

.confirm-tip {
  font-size: 12px;
  color: #bbb;
  margin-bottom: 20px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 10px 26px;
  font-size: 14px;
  cursor: pointer;
}

.btn.ghost {
  background: #fff;
  border: 1.5px solid #dcdfe6;
  color: #666;
}

.btn.danger-solid {
  background: #e5484d;
  color: #fff;
  font-weight: 600;
}

.btn.danger-solid:hover {
  background: #cf3f44;
}
</style>
