<template>
  <div class="categories-page">
    <p class="page-tip">隐藏的分类不会出现在「记一笔」里,但历史账单和统计数据不受影响。</p>

    <!-- 一级分类 -->
    <div v-for="p in parents" :key="p.id" class="card cat-card" :class="{ dim: p.is_hidden }">
      <div class="cat-head">
        <span class="cat-icon">{{ p.icon }}</span>
        <template v-if="editingId === p.id">
          <input
            v-model="editName"
            class="text-input inline-input"
            maxlength="8"
            @keyup.enter="saveRename(p.id)"
          />
          <button class="mini-btn ok" @click="saveRename(p.id)">保存</button>
          <button class="mini-btn" @click="editingId = null">取消</button>
        </template>
        <template v-else>
          <span class="cat-name">{{ p.name }}</span>
          <span v-if="p.is_hidden" class="badge">已隐藏</span>
          <span class="cat-count">{{ p.children.length }} 个二级</span>
          <span class="spacer"></span>
          <button class="mini-btn" @click="startRename(p)">重命名</button>
          <button class="mini-btn" @click="toggleHidden(p)">
            {{ p.is_hidden ? '显示' : '隐藏' }}
          </button>
          <button class="mini-btn add" @click="startAddChild(p)">+ 添加二级</button>
        </template>
      </div>

      <!-- 二级分类 -->
      <div class="cat-children">
        <div v-for="c in p.children" :key="c.id" class="child-row" :class="{ dim: c.is_hidden }">
          <template v-if="editingId === c.id">
            <input
              v-model="editName"
              class="text-input inline-input"
              maxlength="8"
              @keyup.enter="saveRename(c.id)"
            />
            <button class="mini-btn ok" @click="saveRename(c.id)">保存</button>
            <button class="mini-btn" @click="editingId = null">取消</button>
          </template>
          <template v-else>
            <span class="child-name">{{ c.name }}</span>
            <span v-if="c.is_hidden" class="badge">已隐藏</span>
            <span class="spacer"></span>
            <button class="mini-btn" @click="startRename(c)">重命名</button>
            <button class="mini-btn" @click="toggleHidden(c)">
              {{ c.is_hidden ? '显示' : '隐藏' }}
            </button>
          </template>
        </div>
        <div v-if="addingChildFor === p.id" class="child-row add-row">
          <input
            v-model="newChildName"
            class="text-input inline-input"
            maxlength="8"
            placeholder="二级分类名称,如:宠物用品"
            @keyup.enter="saveChild(p.id)"
          />
          <button class="mini-btn ok" @click="saveChild(p.id)">添加</button>
          <button class="mini-btn" @click="addingChildFor = null">取消</button>
        </div>
      </div>
    </div>

    <!-- 新增一级分类 -->
    <div class="card cat-card add-card">
      <div class="cat-head">
        <span class="cat-icon">{{ newParentIcon }}</span>
        <input
          v-model="newParentName"
          class="text-input inline-input"
          maxlength="8"
          placeholder="新的大类名称,如:宠物"
          @keyup.enter="saveParent"
        />
        <button class="mini-btn ok" @click="saveParent">添加一级分类</button>
      </div>
      <div class="icon-picker">
        <span class="icon-label">选个图标:</span>
        <button
          v-for="e in EMOJIS"
          :key="e"
          class="emoji-btn"
          :class="{ active: newParentIcon === e }"
          @click="newParentIcon = e"
        >
          {{ e }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['changed'])

const EMOJIS = ['🍚', '🍜', '🚌', '🚗', '✈️', '🛍️', '👗', '🏠', '💡', '🎮', '🎬', '📚', '✏️', '💊', '🏥', '🎁', '🧧', '💰', '📦', '🐱']

const parents = ref([])
const editingId = ref(null)
const editName = ref('')
const addingChildFor = ref(null)
const newChildName = ref('')
const newParentName = ref('')
const newParentIcon = ref('📦')

async function load() {
  parents.value = await window.heima.listCategories()
}

function startRename(cat) {
  editingId.value = cat.id
  editName.value = cat.name
}

async function saveRename(id) {
  const name = editName.value.trim()
  if (!name) return
  await window.heima.renameCategory(id, name)
  editingId.value = null
  await load()
  emit('changed')
}

async function toggleHidden(cat) {
  await window.heima.setCategoryHidden(cat.id, cat.is_hidden ? 0 : 1)
  await load()
  emit('changed')
}

function startAddChild(p) {
  addingChildFor.value = p.id
  newChildName.value = ''
}

async function saveChild(parentId) {
  const name = newChildName.value.trim()
  if (!name) return
  await window.heima.addCategory({ parentId, name, icon: '' })
  addingChildFor.value = null
  await load()
  emit('changed')
}

async function saveParent() {
  const name = newParentName.value.trim()
  if (!name) return
  await window.heima.addCategory({ parentId: null, name, icon: newParentIcon.value })
  newParentName.value = ''
  newParentIcon.value = '📦'
  await load()
  emit('changed')
}

onMounted(load)
</script>

<style scoped>
.categories-page {
  max-width: 760px;
  margin: 0 auto;
}

.page-tip {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
  padding-left: 4px;
}

.cat-card {
  padding: 14px 20px;
  margin-bottom: 14px;
}

.cat-card.dim {
  opacity: 0.55;
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cat-icon {
  font-size: 20px;
}

.cat-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.cat-count {
  font-size: 12px;
  color: #999;
}

.badge {
  font-size: 11px;
  color: #b07a00;
  background: #fdf3e2;
  border-radius: 4px;
  padding: 1px 6px;
}

.spacer {
  flex: 1;
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

.mini-btn.ok {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
}

.mini-btn.ok:hover {
  background: #e08e0a;
}

.mini-btn.add {
  border-style: dashed;
}

.inline-input {
  width: 220px;
  padding: 6px 10px;
  font-size: 13px;
}

/* 二级列表 */
.cat-children {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 12px 0 2px 30px;
}

.child-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  background: #f7f8fa;
  border-radius: 16px;
}

.child-row.dim {
  opacity: 0.55;
}

.child-name {
  font-size: 13px;
  color: #444;
}

.add-row {
  border: 1px dashed #dcdfe6;
  background: #fff;
  padding: 5px 10px;
}

/* 新增一级 */
.add-card {
  border: 1px dashed #d5d9e0;
}

.icon-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0 2px 30px;
}

.icon-label {
  font-size: 12px;
  color: #999;
  margin-right: 4px;
}

.emoji-btn {
  width: 34px;
  height: 34px;
  border: 1.5px solid #e4e6eb;
  background: #fff;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.emoji-btn:hover {
  border-color: #f59e0b;
}

.emoji-btn.active {
  border-color: #f59e0b;
  background: #fdf3e2;
}
</style>
