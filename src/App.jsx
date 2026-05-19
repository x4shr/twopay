import React, { useEffect, useMemo, useState } from 'react'
import { Plus, X, ReceiptText, Check, WalletCards, Users, ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react'

const STORAGE_KEY = 'twopay_entries_v1'

const people = [
  { id: 'me', name: '我' },
  { id: 'partner', name: '女友' },
]

const categories = ['餐飲', '交通', '日用品', '約會', '旅行', '其他']

const demoEntries = [
  {
    id: 1,
    type: 'expense',
    title: '晚餐',
    category: '餐飲',
    amount: 820,
    payer: 'me',
    date: '今天 20:13',
    note: '平均分帳',
  },
  {
    id: 2,
    type: 'expense',
    title: '計程車',
    category: '交通',
    amount: 260,
    payer: 'partner',
    date: '昨天 23:02',
    note: '平均分帳',
  },
]

function currency(value) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value)
}

function personName(id) {
  return people.find((p) => p.id === id)?.name || id
}

function nowLabel() {
  const date = new Date()
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function computeBalance(entries) {
  // 正數：女友欠我。負數：我欠女友。
  return entries.reduce((balance, entry) => {
    if (entry.type === 'expense') {
      const half = Number(entry.amount) / 2
      return entry.payer === 'me' ? balance + half : balance - half
    }

    if (entry.type === 'settlement') {
      if (entry.payer === 'partner' && entry.receiver === 'me') return balance - Number(entry.amount)
      if (entry.payer === 'me' && entry.receiver === 'partner') return balance + Number(entry.amount)
    }

    return balance
  }, 0)
}

function EntryRow({ entry, onDelete }) {
  const isExpense = entry.type === 'expense'
  const impact = isExpense
    ? entry.payer === 'me'
      ? entry.amount / 2
      : -entry.amount / 2
    : entry.payer === 'partner'
      ? -entry.amount
      : entry.amount

  return (
    <div className="entry-row">
      <div className="entry-icon">{isExpense ? <ReceiptText size={20} /> : <Check size={20} />}</div>
      <div className="entry-main">
        <div className="entry-topline">
          <p className="entry-title">{entry.title}</p>
          <p className={impact >= 0 ? 'entry-impact positive' : 'entry-impact negative'}>
            {impact >= 0 ? '+' : '−'}{currency(Math.abs(impact))}
          </p>
        </div>
        <div className="entry-meta">
          <span>{entry.category} · {entry.date}</span>
          <span>{isExpense ? `${personName(entry.payer)}先付` : entry.note}</span>
        </div>
      </div>
      <button className="delete-btn" onClick={() => onDelete(entry.id)} aria-label="刪除這筆紀錄">
        <X size={16} />
      </button>
    </div>
  )
}

function QuickAdd({ onAdd, onClose, balance }) {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('餐飲')
  const [payer, setPayer] = useState('me')

  const numericAmount = Number(amount || 0)
  const canSubmit = numericAmount > 0 && (type === 'settlement' || title.trim().length > 0)

  function submit() {
    if (!canSubmit) return

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type,
      title: type === 'expense' ? title.trim() : '轉帳結清',
      category: type === 'expense' ? category : '結清',
      amount: numericAmount,
      payer,
      receiver: payer === 'me' ? 'partner' : 'me',
      date: nowLabel(),
      note: type === 'expense' ? '平均分帳' : `${personName(payer)}轉給${payer === 'me' ? '女友' : '我'}`,
    }

    onAdd(entry)
  }

  return (
    <div className="modal-backdrop">
      <div className="sheet">
        <div className="sheet-header">
          <div>
            <p className="eyebrow">快速新增</p>
            <h2>記一筆帳</h2>
          </div>
          <button onClick={onClose} className="round-btn" aria-label="關閉新增表單">
            <X size={18} />
          </button>
        </div>

        <div className="segmented">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>共同支出</button>
          <button className={type === 'settlement' ? 'active' : ''} onClick={() => setType('settlement')}>結清轉帳</button>
        </div>

        <label>金額</label>
        <div className="amount-box">
          <span>NT$</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="0"
            autoFocus
          />
        </div>
        <div className="quick-amounts">
          {[100, 200, 500, 1000].map((n) => (
            <button key={n} onClick={() => setAmount(String(Number(amount || 0) + n))}>+{n}</button>
          ))}
        </div>

        {type === 'expense' && (
          <>
            <label>項目</label>
            <input className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：晚餐、電影票、停車費" />

            <div className="chips">
              {categories.map((c) => (
                <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </>
        )}

        <label>誰先付？</label>
        <div className="payer-grid">
          {people.map((p) => (
            <button key={p.id} className={payer === p.id ? 'active' : ''} onClick={() => setPayer(p.id)}>{p.name}</button>
          ))}
        </div>

        <div className="hint">
          {type === 'expense'
            ? `預設平均分帳。若${personName(payer)}先付 ${currency(numericAmount || 0)}，另一方需負擔 ${currency((numericAmount || 0) / 2)}。`
            : `目前淨額為 ${currency(Math.abs(balance))}。這筆會被視為${personName(payer)}轉帳給${payer === 'me' ? '女友' : '我'}。`}
        </div>

        <button className="primary-btn" disabled={!canSubmit} onClick={submit}>
          <Plus size={18} /> 新增到共同帳本
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : demoEntries
  })
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const balance = useMemo(() => computeBalance(entries), [entries])
  const totalExpense = useMemo(() => entries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + Number(entry.amount), 0), [entries])

  const statusText = balance > 0
    ? `女友還要給你 ${currency(balance)}`
    : balance < 0
      ? `你還要給女友 ${currency(Math.abs(balance))}`
      : '你們已經打平'

  function clearAll() {
    if (window.confirm('確定要清空所有紀錄嗎？')) {
      setEntries([])
    }
  }

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <header className="hero">
          <div className="hero-top">
            <div>
              <p className="hero-label">共同帳本</p>
              <h1>TwoPay</h1>
            </div>
            <div className="avatars">
              <div>我</div>
              <div>她</div>
            </div>
          </div>

          <div className="balance-card">
            <p className="balance-label">目前淨額</p>
            <strong>{currency(Math.abs(balance))}</strong>
            <div className="balance-status">
              {balance >= 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
              {statusText}
            </div>
          </div>
        </header>

        <section className="content">
          <div className="summary-grid">
            <div className="summary-card">
              <WalletCards size={19} />
              <span>共同支出</span>
              <strong>{currency(totalExpense)}</strong>
            </div>
            <div className="summary-card">
              <Users size={19} />
              <span>成員</span>
              <strong>2 人</strong>
            </div>
          </div>

          <button className="primary-btn large" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> 快速新增一筆
          </button>

          <div className="section-title">
            <div>
              <h2>最近紀錄</h2>
              <p>第一版資料會儲存在你的手機瀏覽器</p>
            </div>
            <button className="reset-btn" onClick={clearAll} title="清空紀錄">
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="entries">
            {entries.length === 0 ? (
              <div className="empty-state">目前沒有紀錄。點「快速新增一筆」開始使用。</div>
            ) : (
              entries.map((entry) => <EntryRow key={entry.id} entry={entry} onDelete={(id) => setEntries((prev) => prev.filter((item) => item.id !== id))} />)
            )}
          </div>
        </section>
      </section>

      {showAdd && <QuickAdd balance={balance} onClose={() => setShowAdd(false)} onAdd={(entry) => {
        setEntries((prev) => [entry, ...prev])
        setShowAdd(false)
      }} />}
    </main>
  )
}
