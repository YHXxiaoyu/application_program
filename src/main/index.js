import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'

// 统一数据目录:开发版和安装版共用同一份本地记账数据
app.setPath('userData', join(app.getPath('appData'), 'heimajizhang'))
import {
  initDb,
  listBills,
  addBill,
  updateBill,
  deleteBill,
  listCategories,
  monthSummary,
  statsOverview,
  statsByParent,
  statsByChild,
  statsTrend,
  addCategory,
  renameCategory,
  setCategoryHidden,
  exportAllBills,
  billsToCsv
} from './db'

// 界面通过这几个"通道"读写本地数据库(所有数据只在用户电脑上)
function registerIpc() {
  ipcMain.handle('db:listBills', (_e, params) => listBills(params))
  ipcMain.handle('db:addBill', (_e, bill) => addBill(bill))
  ipcMain.handle('db:updateBill', (_e, id, patch) => updateBill(id, patch))
  ipcMain.handle('db:deleteBill', (_e, id) => deleteBill(id))
  ipcMain.handle('db:listCategories', () => listCategories())
  ipcMain.handle('db:monthSummary', (_e, month) => monthSummary(month))
  ipcMain.handle('db:statsOverview', (_e, month) => statsOverview(month))
  ipcMain.handle('db:statsByParent', (_e, month) => statsByParent(month))
  ipcMain.handle('db:statsByChild', (_e, month, parentId) => statsByChild(month, parentId))
  ipcMain.handle('db:statsTrend', () => statsTrend())
  ipcMain.handle('db:addCategory', (_e, payload) => addCategory(payload))
  ipcMain.handle('db:renameCategory', (_e, id, name) => renameCategory(id, name))
  ipcMain.handle('db:setCategoryHidden', (_e, id, hidden) => setCategoryHidden(id, hidden))
  // 导出全部账单为 CSV(带 UTF-8 标记,Excel 打开中文不乱码)
  ipcMain.handle('export:csv', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const d = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '导出账单备份',
      defaultPath: `小鱼记账导出_${stamp}.csv`,
      filters: [{ name: 'CSV 文件(可用 Excel 打开)', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return { canceled: true }
    fs.writeFileSync(filePath, '\uFEFF' + billsToCsv(exportAllBills()), 'utf8')
    return { canceled: false, filePath }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: '小鱼记账',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发时加载调试服务器,打包后加载本地页面
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDb()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    // macOS 习惯:点击 Dock 图标时若无窗口则重新创建
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Windows 上关闭所有窗口即退出应用;macOS 保留常驻
  if (process.platform !== 'darwin') app.quit()
})
