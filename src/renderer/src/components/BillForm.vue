<template>
  <div class="bill-form">
    <div class="field">
      <label class="field-label">金额(元)<span class="required">*</span></label>
      <div class="amount-box" :class="{ 'has-error': errors.amount }">
        <span class="cur">¥</span>
        <input v-model="amount" type="number" min="0.01" max="999999.99" step="0.01" placeholder="0.00" />
      </div>
      <p class="field-error" v-if="errors.amount">{{ errors.amount }}</p>
    </div>

    <div class="field">
      <label class="field-label">日期<span class="required">*</span></label>
      <input v-model="form.date" type="date" class="text-input" />
      <p class="field-error" v-if="errors.date">{{ errors.date }}</p>
    </div>

    <div class="field">
      <label class="field-label">分类<span class="required">*</span></label>
      <div class="chip-grid">
        <button
          v-for="p in categories"
          :key="p.id"
          type="button"
          class="chip parent-chip"
          :class="{ active: form.parentId === p.id }"
          @click="selectParent(p.id)"
        >
          <span class="chip-icon">{{ p.icon }}</span>{{ p.name }}
        </button>
      </div>
      <div v-if="parent" class="chip-grid sub-grid">
        <button
          v-for="c in parent.children"
          :key="c.id"
          type="button"
          class="chip sub-chip"
          :class="{ active: form.categoryId === c.id }"
          @click="form.categoryId = c.id"
        >
          {{ c.name }}
        </button>
      </div>
      <p class="field-error" v-if="errors.category">{{ errors.category }}</p>
    </div>

    <div class="field">
      <label class="field-label">支付方式(可选)</label>
      <div class="chip-grid">
        <button
          v-for="m in payMethods"
          :key="m"
          type="button"
          class="chip sub-chip"
          :class="{ active: form.paymentMethod === m }"
          @click="form.paymentMethod = form.paymentMethod === m ? '' : m"
        >
          {{ m }}
        </button>
      </div>
    </div>

    <div class="field">
      <label class="field-label">备注(可选)</label>
      <input
        v-model="form.note"
        type="text"
        maxlength="50"
        class="text-input"
        placeholder="例如:和同事午饭"
      />
    </div>

    <div class="form-actions">
      <button v-if="showCancel" type="button" class="btn ghost" @click="$emit('cancel')">取消</button>
      <button type="button" class="btn primary" @click="submit">{{ submitLabel }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { yuanToCents } from '../lib/money'
import { todayStr } from '../lib/date'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  initial: { type: Object, default: null }, // 编辑模式时传入原账单
  submitLabel: { type: String, default: '保存' },
  showCancel: { type: Boolean, default: false }
})
const emit = defineEmits(['submit', 'cancel'])

const payMethods = ['微信', '支付宝', '现金', '银行卡', '信用卡', '其他']

const amount = ref('')
const form = reactive({ date: todayStr(), note: '', categoryId: null, parentId: null, paymentMethod: '' })
const errors = reactive({ amount: '', date: '', category: '' })

const parent = computed(() => props.categories.find((c) => c.id === form.parentId) || null)

// 编辑模式:回填原账单内容
watch(
  () => props.initial,
  (init) => {
    if (init) {
      amount.value = String(init.amount_cents / 100)
      form.date = init.date
      form.note = init.note
      form.parentId = init.parent_id
      form.categoryId = init.category_id
      form.paymentMethod = init.payment_method
    }
  },
  { immediate: true }
)

function selectParent(id) {
  form.parentId = id
  form.categoryId = null
}

function submit() {
  errors.amount = ''
  errors.date = ''
  errors.category = ''
  const cents = yuanToCents(amount.value)
  if (!amount.value || !Number.isFinite(cents) || cents <= 0) {
    errors.amount = '请输入正确的金额(大于 0)'
    return
  }
  // 日期不能为空:账单页是按"年月"筛选的,日期为空会哪个也匹配不上,像"消失"了一样
  if (!form.date) {
    errors.date = '请选择日期(不能为空)'
    return
  }
  if (!form.categoryId) {
    errors.category = '请选择分类(先点一级大类,再点二级小类)'
    return
  }
  emit('submit', {
    amountCents: cents,
    categoryId: form.categoryId,
    date: form.date,
    note: form.note.trim(),
    paymentMethod: form.paymentMethod
  })
}

function reset() {
  amount.value = ''
  form.date = todayStr()
  form.note = ''
  form.parentId = null
  form.categoryId = null
  form.paymentMethod = ''
}

defineExpose({ reset })
</script>

<style scoped>
.bill-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.required {
  color: #e5484d;
  margin-left: 2px;
}

.amount-box {
  display: flex;
  align-items: center;
  border: 1.5px solid #dcdfe6;
  border-radius: 8px;
  padding: 0 14px;
  transition: border-color 0.15s;
}

.amount-box:focus-within {
  border-color: #f59e0b;
}

.amount-box.has-error {
  border-color: #e5484d;
}

.amount-box .cur {
  font-size: 20px;
  color: #f59e0b;
  margin-right: 6px;
}

.amount-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 28px;
  font-weight: 600;
  padding: 10px 0;
  background: transparent;
}

.text-input {
  width: 100%;
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

.chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sub-grid {
  margin-top: 8px;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 8px;
}

.chip {
  border: 1.5px solid #dcdfe6;
  background: #fff;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}

.chip:hover {
  border-color: #f59e0b;
  color: #f59e0b;
}

.chip.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #fff;
}

.parent-chip {
  padding: 8px 14px;
}

.chip-icon {
  margin-right: 4px;
}

.field-error {
  color: #e5484d;
  font-size: 12px;
  margin-top: 6px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 4px;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 11px 28px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn.primary {
  background: #f59e0b;
  color: #fff;
  font-weight: 600;
}

.btn.primary:hover {
  background: #e08e0a;
}

.btn.ghost {
  background: #fff;
  border: 1.5px solid #dcdfe6;
  color: #666;
}

.btn.ghost:hover {
  border-color: #999;
}
</style>
