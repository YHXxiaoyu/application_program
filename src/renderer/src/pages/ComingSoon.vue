<template>
  <div class="card placeholder">
    <p class="placeholder-icon">🐟</p>
    <p class="placeholder-title">「{{ title }}」即将上线</p>
    <p class="placeholder-text">该功能将在后续步骤中实现,敬请期待</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' }
})
</script>

<style scoped>
.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed #d5d9e0;
}

.placeholder-icon {
  font-size: 52px;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 600;
  color: #444;
}

.placeholder-text {
  font-size: 14px;
  color: #999;
}
</style>
