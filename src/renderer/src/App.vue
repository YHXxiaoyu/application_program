<template>
  <div class="layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-mark">🐟</span>
        <span class="logo-text">小鱼记账</span>
      </div>
      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: active === item.key }"
          @click="active = item.key"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <button class="export-btn" @click="exportData">⬇ 导出账单备份</button>
      <p class="sidebar-footer">数据只保存在本机</p>
    </aside>

    <!-- 主内容区 -->
    <main class="content">
      <header class="page-header">
        <h1>{{ current.label }}</h1>
      </header>
      <div class="page-body">
        <RecordPage v-if="active === 'record'" :categories="categories" />
        <BillsPage v-else-if="active === 'bills'" :categories="categories" />
        <StatsPage v-else-if="active === 'stats'" :categories="categories" />
        <CategoriesPage v-else-if="active === 'categories'" @changed="reloadCategories" />
        <ComingSoon v-else :title="current.label" />
      </div>
      <div v-if="toast" class="toast">{{ toast }}</div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RecordPage from './pages/RecordPage.vue'
import BillsPage from './pages/BillsPage.vue'
import StatsPage from './pages/StatsPage.vue'
import CategoriesPage from './pages/CategoriesPage.vue'
import ComingSoon from './pages/ComingSoon.vue'

const navItems = [
  { key: 'record', label: '记一笔', icon: '✏️' },
  { key: 'bills', label: '账单', icon: '📒' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'categories', label: '分类管理', icon: '🗂️' }
]

const active = ref('record')
const current = computed(() => navItems.find((item) => item.key === active.value))

// 读取分类树(过滤掉已隐藏的),传给各页面使用
const categories = ref([])
const toast = ref('')

async function reloadCategories() {
  const all = await window.heima.listCategories()
  categories.value = all
    .filter((p) => !p.is_hidden)
    .map((p) => ({ ...p, children: p.children.filter((c) => !c.is_hidden) }))
}

async function exportData() {
  const res = await window.heima.exportCsv()
  if (res.canceled) {
    toast.value = '已取消导出'
  } else {
    toast.value = '✅ 已导出:' + res.filePath
  }
  setTimeout(() => (toast.value = ''), 4000)
}

onMounted(reloadCategories)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  font-family: 'PingFang SC', 'Microsoft YaHei', '微软雅黑', sans-serif;
  color: #333;
}

.layout {
  display: flex;
  height: 100%;
}

/* 左侧导航栏 */
.sidebar {
  width: 210px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #23262f;
  color: #fff;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-mark {
  font-size: 26px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.nav {
  flex: 1;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #b8bcc7;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.nav-item.active {
  background: #f59e0b;
  color: #fff;
}

.nav-icon {
  font-size: 16px;
}

.export-btn {
  margin: 0 14px 10px;
  padding: 9px;
  border: 1px dashed rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: transparent;
  color: #b8bcc7;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.export-btn:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.sidebar-footer {
  padding: 14px 20px;
  font-size: 12px;
  color: #6b7180;
}

/* 主内容区 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f6f8;
  min-width: 0;
}

.page-header {
  padding: 22px 32px;
  background: #fff;
  border-bottom: 1px solid #e8eaee;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.page-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

/* 通用卡片 */
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* 通用输入框(供各页面引用,定义在 BillForm 内的同名样式优先) */
.text-input {
  border: 1.5px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus {
  border-color: #f59e0b;
}

/* 通用弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px 28px;
  width: 560px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

/* 通用提示气泡 */
.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.78);
  color: #fff;
  padding: 10px 26px;
  border-radius: 22px;
  font-size: 14px;
  z-index: 100;
}
</style>
