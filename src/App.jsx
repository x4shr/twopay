import React, { useEffect, useMemo, useState } from 'react'
import { Plus, X, ReceiptText, Check, WalletCards, Users, ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const LEDGER_ID = 'x4shr-couple-ledger'

const people = [
  { id: 'me', name: '我' },
  { id: 'partner', name: '女友' },
]

const categories = ['餐飲', '交通', '日用品', '約會', '旅行', '其他']

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
      ? Number(entry.amount) / 2
      : -Number(entry.amount) / 2
    : entry.payer === 'partner'
      ? -Number(entry.amount)
      : Number(entry.amount)

  return (
    <div className="entry-row">
      <div className="entry-icon">
        {isExpense ? <ReceiptText size={20} /> : <Check size={20} />}
      </div>

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const numericAmount = Number(amount || 0)
  const canSubmit = numericAmount > 0 && (type === 'settlement' || title.trim().length > 0)

  async function submit() {
    if (!canSubmit || isSubmitting) return

    const entry = {
      type,
      title: type === 'expense' ? title.trim() : '轉帳結清',
      category: type === 'expense' ? category : '結清',
      amount: numericAmount,
      payer,
      receiver: payer === 'me' ? 'partner' : 'me',
      date: nowLabel(),
      note: type === 'expense' ? '平均分帳' : `${personName(payer)}轉給${payer === 'me' ? '女友' : '我'}`,
    }

    try {
      setIsSubmitting(true)
      await onAdd(entry)
    } finally {
      setIsSubmitting(false)
    }
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
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>
            共同支出
          </button>
          <button className={type === 'settlement' ? 'active' : ''} onClick={() => setType('settlement')}>
            結清轉帳
          </button>
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
            <button key={n} onClick={() => setAmount(String(Number(amount || 0) + n))}>
              +{n}
            </button>
          ))}
        </div>

        {type === 'expense' && (
          <>
            <label>項目</label>
            <input
              className="text-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：晚餐、電影票、停車費"
            />

            <div className="chips">
              {categories.map((c) => (
                <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>
                  {c}
                </button>
              ))}
            </div>
          </>
        )}

        <label>誰先付？</label>
        <div className="payer-grid">
          {people.map((p) => (
            <button key={p.id} className={payer === p.id ? 'active' : ''} onClick={() => setPayer(p.id)}>
              {p.name}
            </button>
          ))}
        </div>

        <div className="hint">
          {type === 'expense'
            ? `預設平均分帳。若${personName(payer)}先付 ${currency(numericAmount || 0)}，另一方需負擔 ${currency((numericAmount || 0) / 2)}。`
            : `目前淨額為 ${currency(Math.abs(balance))}。這筆會被視為${personName(payer)}轉帳給${payer === 'me' ? '女友' : '我'}。`}
        </div>

        <button className="primary-btn" disabled={!canSubmit || isSubmitting} onClick={submit}>
          <Plus size={18} /> {isSubmitting ? '新增中...' : '新增到共同帳本'}
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [entries, setEntries] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const entriesRef = collection(db, 'ledgers', LEDGER_ID, 'entries')

  useEffect(() => {
    const q = query(entriesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }))

        setEntries(data)
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setErrorMessage(error.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const balance = useMemo(() => computeBalance(entries), [entries])

  const totalExpense = useMemo(
    () => entries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount), 0),
    [entries]
  )

  const statusText = balance > 0
    ? `女友還要給你 ${currency(balance)}`
    : balance < 0
      ? `你還要給女友 ${currency(Math.abs(balance))}`
      : '你們已經打平'

  async function addEntry(entry) {
    await addDoc(entriesRef, {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setShowAdd(false)
  }

  async function deleteEntry(id) {
    await deleteDoc(doc(db, 'ledgers', LEDGER_ID, 'entries', id))
  }

  async function clearAll() {
    if (!window.confirm('確定要清空所有紀錄嗎？')) return

    const snapshot = await getDocs(entriesRef)
    const batch = writeBatch(db)

    snapshot.forEach((document) => {
      batch.delete(document.ref)
    })

    await batch.commit()
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
              <strong>2 人同步</strong>
            </div>
          </div>

          <button className="primary-btn large" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> 快速新增一筆
          </button>

          <div className="section-title">
            <div>
              <h2>最近紀錄</h2>
              <p>資料會同步到 Firebase，兩人可看到同一本帳</p>
            </div>

            <button className="reset-btn" onClick={clearAll} title="清空紀錄">
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="entries">
            {loading ? (
              <div className="empty-state">正在讀取共同帳本...</div>
            ) : errorMessage ? (
              <div className="empty-state">讀取失敗：{errorMessage}</div>
            ) : entries.length === 0 ? (
              <div className="empty-state">目前沒有紀錄。點「快速新增一筆」開始使用。</div>
            ) : (
              entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={deleteEntry} />
              ))
            )}
          </div>
        </section>
      </section>

      {showAdd && (
        <QuickAdd
          balance={balance}
          onClose={() => setShowAdd(false)}
          onAdd={addEntry}
        />
      )}
    </main>
  )
}