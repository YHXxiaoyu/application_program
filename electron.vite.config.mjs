import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        // node:sqlite 是 Electron 内置模块,保持运行时引用,不打包进代码
        external: ['node:sqlite', 'electron']
      }
    }
  },
  preload: {},
  renderer: {
    plugins: [vue()]
  }
})
