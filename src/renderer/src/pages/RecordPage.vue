<template>
  <div class="record-page">
    <div class="card form-card">
      <BillForm ref="formRef" :categories="categories" submit-label="保存这笔" @submit="save" />
    </div>
    <div class="toast" v-if="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BillForm from '../components/BillForm.vue'

defineProps({
  categories: { type: Array, default: () => [] }
})

const formRef = ref(null)
const toast = ref('')

async function save(bill) {
  await window.heima.addBill(bill)
  formRef.value.reset()
  toast.value = '✅ 已保存'
  setTimeout(() => (toast.value = ''), 2000)
}
</script>

<style scoped>
.record-page {
  max-width: 640px;
  margin: 0 auto;
}

.form-card {
  padding: 28px 32px;
}
</style>
