import { contextBridge, ipcRenderer } from 'electron'

// 界面与底层之间的"桥梁":界面上可用的数据读写接口
const api = {
  listBills: (params) => ipcRenderer.invoke('db:listBills', params),
  addBill: (bill) => ipcRenderer.invoke('db:addBill', bill),
  updateBill: (id, patch) => ipcRenderer.invoke('db:updateBill', id, patch),
  deleteBill: (id) => ipcRenderer.invoke('db:deleteBill', id),
  listCategories: () => ipcRenderer.invoke('db:listCategories'),
  monthSummary: (month) => ipcRenderer.invoke('db:monthSummary', month),
  statsOverview: (month) => ipcRenderer.invoke('db:statsOverview', month),
  statsByParent: (month) => ipcRenderer.invoke('db:statsByParent', month),
  statsByChild: (month, parentId) => ipcRenderer.invoke('db:statsByChild', month, parentId),
  statsTrend: () => ipcRenderer.invoke('db:statsTrend'),
  addCategory: (payload) => ipcRenderer.invoke('db:addCategory', payload),
  renameCategory: (id, name) => ipcRenderer.invoke('db:renameCategory', id, name),
  setCategoryHidden: (id, hidden) => ipcRenderer.invoke('db:setCategoryHidden', id, hidden),
  exportCsv: () => ipcRenderer.invoke('export:csv')
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('heima', api)
} else {
  window.heima = api
}
