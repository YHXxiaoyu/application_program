import { DatabaseSync } from 'node:sqlite'
import { join } from 'path'
import { app } from 'electron'

// 内置默认分类(一级 + 二级),首次启动时自动写入数据库
const DEFAULT_CATEGORIES = [
  { name: '餐饮饮食', icon: '🍚', children: ['早餐', '午餐', '晚餐', '夜宵', '外卖', '零食饮料', '水果', '聚餐请客'] },
  { name: '交通出行', icon: '🚌', children: ['公交地铁', '打车网约车', '火车高铁', '飞机', '加油充电', '停车过路费', '共享单车'] },
  { name: '购物消费', icon: '🛍️', children: ['服饰鞋包', '数码电器', '日用品', '美妆护肤', '烟酒茶叶', '其他购物'] },
  { name: '居住生活', icon: '🏠', children: ['房租房贷', '水电燃气', '物业费', '网费话费', '家居维修', '日常耗材'] },
  { name: '娱乐休闲', icon: '🎮', children: ['电影演出', '游戏充值', '运动健身', '旅游度假', '图书影音', '休闲消遣'] },
  { name: '医疗健康', icon: '💊', children: ['门诊挂号', '药品', '住院', '体检', '保健品', '医疗器具'] },
  { name: '学习教育', icon: '📚', children: ['学费', '培训课程', '书籍资料', '文具', '考试报名'] },
  { name: '人情往来', icon: '🎁', children: ['红包礼金', '请客送礼', '孝敬长辈', '慈善捐款'] },
  { name: '金融支出', icon: '💰', children: ['保险保费', '贷款还款', '手续费利息'] },
  { name: '其他', icon: '📦', children: ['其他支出'] }
]

let db = null

export function initDb() {
  const file = join(app.getPath('userData'), 'heima.db')
  db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_cents INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date DESC);
  `)
  seedCategories()
}

function seedCategories() {
  const row = db.prepare('SELECT COUNT(*) AS n FROM categories').get()
  if (row.n > 0) return
  const insert = db.prepare('INSERT INTO categories (parent_id, name, icon, sort_order) VALUES (?, ?, ?, ?)')
  db.exec('BEGIN')
  try {
    DEFAULT_CATEGORIES.forEach((parent, i) => {
      const r = insert.run(null, parent.name, parent.icon, i + 1)
      parent.children.forEach((child, j) => {
        insert.run(r.lastInsertRowid, child, '', (i + 1) * 100 + j + 1)
      })
    })
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

const BILL_SELECT = `
  SELECT b.id, b.amount_cents, b.date, b.note, b.payment_method,
         c.name AS category_name, c.id AS category_id,
         p.id AS parent_id, p.name AS parent_name, p.icon AS parent_icon
  FROM bills b
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN categories p ON p.id = c.parent_id
`

export function listBills({ month = '', keyword = '', categoryId = 0 } = {}) {
  let sql = BILL_SELECT + ' WHERE 1=1'
  const params = []
  if (month) {
    sql += ' AND substr(b.date, 1, 7) = ?'
    params.push(month)
  }
  if (categoryId) {
    sql += ' AND p.id = ?'
    params.push(categoryId)
  }
  if (keyword) {
    sql += ' AND (b.note LIKE ? OR c.name LIKE ? OR p.name LIKE ?)'
    const like = '%' + keyword + '%'
    params.push(like, like, like)
  }
  sql += ' ORDER BY b.date DESC, b.id DESC'
  return db.prepare(sql).all(...params)
}

export function getBill(id) {
  return db.prepare(BILL_SELECT + ' WHERE b.id = ?').get(id)
}

export function addBill({ amountCents, categoryId, date, note = '', paymentMethod = '' }) {
  const r = db
    .prepare('INSERT INTO bills (amount_cents, category_id, date, note, payment_method) VALUES (?, ?, ?, ?, ?)')
    .run(amountCents, categoryId, date, note, paymentMethod)
  return getBill(r.lastInsertRowid)
}

export function updateBill(id, { amountCents, categoryId, date, note = '', paymentMethod = '' }) {
  db.prepare(
    `UPDATE bills
     SET amount_cents = ?, category_id = ?, date = ?, note = ?, payment_method = ?,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`
  ).run(amountCents, categoryId, date, note, paymentMethod, id)
  return getBill(id)
}

export function deleteBill(id) {
  return db.prepare('DELETE FROM bills WHERE id = ?').run(id).changes > 0
}

export function listCategories() {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order').all()
  return rows
    .filter((r) => r.parent_id === null)
    .map((p) => ({
      ...p,
      children: rows.filter((r) => r.parent_id === p.id)
    }))
}

export function monthSummary(month) {
  const r = db
    .prepare(
      'SELECT COALESCE(SUM(amount_cents), 0) AS total_cents, COUNT(*) AS cnt FROM bills WHERE substr(date, 1, 7) = ?'
    )
    .get(month)
  return { totalCents: r.total_cents, count: r.cnt }
}

// ---------- 统计 ----------

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function localTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function statsOverview(month) {
  const today = localTodayStr()
  const todayRow = db
    .prepare('SELECT COALESCE(SUM(amount_cents), 0) AS c FROM bills WHERE date = ?')
    .get(today)
  const monthRow = db
    .prepare(
      'SELECT COALESCE(SUM(amount_cents), 0) AS c, COUNT(*) AS n FROM bills WHERE substr(date, 1, 7) = ?'
    )
    .get(month)

  // 日均:当月按已过天数,过往月份按该月总天数
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  let days
  if (month === curMonth) {
    days = now.getDate()
  } else {
    const [y, m] = month.split('-').map(Number)
    days = new Date(y, m, 0).getDate()
  }
  return {
    todayCents: todayRow.c,
    monthCents: monthRow.c,
    count: monthRow.n,
    avgPerDayCents: days > 0 ? Math.round(monthRow.c / days) : 0
  }
}

// 本月各一级分类支出(按金额从大到小)
export function statsByParent(month) {
  return db
    .prepare(
      `SELECT p.id AS parent_id, p.name AS parent_name, p.icon AS parent_icon,
              COALESCE(SUM(b.amount_cents), 0) AS total_cents
       FROM categories p
       LEFT JOIN categories c ON c.parent_id = p.id
       LEFT JOIN bills b ON b.category_id = c.id AND substr(b.date, 1, 7) = ?
       WHERE p.parent_id IS NULL
       GROUP BY p.id
       ORDER BY total_cents DESC, p.sort_order`
    )
    .all(month)
}

// 某一大类的二级明细
export function statsByChild(month, parentId) {
  return db
    .prepare(
      `SELECT c.name, COALESCE(SUM(b.amount_cents), 0) AS total_cents
       FROM categories c
       LEFT JOIN bills b ON b.category_id = c.id AND substr(b.date, 1, 7) = ?
       WHERE c.parent_id = ?
       GROUP BY c.id
       ORDER BY total_cents DESC, c.sort_order`
    )
    .all(month, parentId)
}

// 近 6 个月支出趋势(含本月,无数据的月份补 0)
export function statsTrend() {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`)
  }
  const rows = db
    .prepare(
      `SELECT substr(date, 1, 7) AS month, SUM(amount_cents) AS total_cents
       FROM bills
       WHERE date >= ?
       GROUP BY substr(date, 1, 7)`
    )
    .all(months[0] + '-01')
  const map = new Map(rows.map((r) => [r.month, r.total_cents]))
  return months.map((m) => ({ month: m, total_cents: map.get(m) || 0 }))
}

// ---------- 分类管理 ----------

export function addCategory({ parentId = null, name, icon = '' }) {
  const base = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories WHERE parent_id IS ?')
    .get(parentId)
  const r = db
    .prepare('INSERT INTO categories (parent_id, name, icon, sort_order) VALUES (?, ?, ?, ?)')
    .run(parentId, name, icon, base.next)
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid)
}

export function renameCategory(id, name) {
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
}

export function setCategoryHidden(id, hidden) {
  db.prepare('UPDATE categories SET is_hidden = ? WHERE id = ?').run(hidden ? 1 : 0, id)
}

// ---------- 数据导出 ----------

export function exportAllBills() {
  return db
    .prepare(
      `SELECT b.date, p.name AS parent_name, c.name AS category_name,
              b.amount_cents, b.payment_method, b.note
       FROM bills b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY b.date DESC, b.id DESC`
    )
    .all()
}

function csvCell(v) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function billsToCsv(rows) {
  const header = ['日期', '一级分类', '二级分类', '金额(元)', '支付方式', '备注']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.date,
        csvCell(r.parent_name || ''),
        csvCell(r.category_name),
        (r.amount_cents / 100).toFixed(2),
        csvCell(r.payment_method),
        csvCell(r.note)
      ].join(',')
    )
  }
  return lines.join('\r\n')
}
