import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { T } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { useAutoRefresh } from '../lib/useAutoRefresh'

const API = import.meta.env.VITE_API_BASE || 'https://merakibackend.vercel.app/api'

function emptyItem() {
  return {
    category: '',
    name: '',
    description: '',
    price: '0',
    sort_order: '0',
    is_active: true,
  }
}

export default function MenuPage() {
  const { lang } = useOutletContext()
  const t = T[lang]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [newItem, setNewItem] = useState(emptyItem())
  const [publishing, setPublishing] = useState(false)
  const [publishNotice, setPublishNotice] = useState('')

  const hasDirtyDrafts = useMemo(() => items.some((item) => item._dirty), [items])

  const load = useCallback(({ silent = false } = {}) => {
    if (silent && hasDirtyDrafts) return
    if (!silent) setLoading(true)
    fetchJson(`${API}/menu`)
      .then((rows) => {
        setItems(rows.map((r) => ({ ...r, _dirty: false })))
        if (!silent) setError('')
      })
      .catch((e) => {
        if (!silent) setError(e.message || t.menu.loadErr)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [hasDirtyDrafts, t.menu.loadErr])

  useEffect(() => {
    load()
  }, [load])
  useAutoRefresh(load, { intervalMs: 20000, enabled: !publishing && !savingId })

  const grouped = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      const key = item.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    })
    return [...map.entries()]
  }, [items])

  const setItemField = (id, key, value) => {
    setItems((prev) => prev.map((item) => (
      item.id === id ? { ...item, [key]: value, _dirty: true } : item
    )))
  }

  const saveItem = async (item) => {
    setSavingId(item.id)
    try {
      const payload = {
        category: item.category,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        sort_order: Number(item.sort_order) || 0,
        is_active: Boolean(item.is_active),
      }
      const saved = await fetchJson(`${API}/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...saved, _dirty: false } : it)))
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setSavingId(null)
    }
  }

  const removeItem = async (id) => {
    setSavingId(id)
    try {
      await fetchJson(`${API}/menu/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((it) => it.id !== id))
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setSavingId(null)
    }
  }

  const createItem = async () => {
    setSavingId('new')
    try {
      const payload = {
        category: newItem.category,
        name: newItem.name,
        description: newItem.description,
        price: Number(newItem.price),
        sort_order: Number(newItem.sort_order) || 0,
        is_active: Boolean(newItem.is_active),
      }
      const created = await fetchJson(`${API}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setItems((prev) => [...prev, { ...created, _dirty: false }])
      setNewItem(emptyItem())
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setSavingId(null)
    }
  }

  const inputCls = 'bg-white/[0.08] border border-white/20 text-white text-xs px-2 py-2 outline-none focus:border-[#8fd0ff] rounded-sm'

  const publishMenu = async () => {
    setPublishing(true)
    setPublishNotice('')
    try {
      const payload = await fetchJson(`${API}/menu/publish`, { method: 'POST' })
      setPublishNotice(
        `${t.menu.publishOk} (${payload.items || 0} ${t.menu.publishItems})`
      )
    } catch (e) {
      setError(e.message || t.menu.publishErr)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[#8fd0ff] text-[10px] tracking-[0.5em] uppercase mb-1">{t.menu.panel}</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-none">{t.menu.title}</h1>
        </div>
        <button
          disabled={publishing}
          onClick={publishMenu}
          className="bg-[#8fd0ff]/20 border border-[#8fd0ff]/40 text-[#b9e7ff] text-xs px-4 py-2 uppercase tracking-[0.2em] disabled:opacity-40"
        >
          {publishing ? t.menu.publishing : t.menu.publish}
        </button>
      </div>

      {error && (
        <div className="px-5 py-3 border border-red-400/40 bg-red-500/15 text-red-100 text-sm">
          {t.common.error}: {error}
        </div>
      )}

      {publishNotice && (
        <div className="px-5 py-3 border border-emerald-300/35 bg-emerald-500/15 text-emerald-100 text-sm">
          {publishNotice}
        </div>
      )}

      <div className="border border-white/15 bg-[#101c2d] p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
        <input className={inputCls} placeholder={t.menu.category} value={newItem.category} onChange={(e) => setNewItem((v) => ({ ...v, category: e.target.value }))} />
        <input className={inputCls} placeholder={t.menu.name} value={newItem.name} onChange={(e) => setNewItem((v) => ({ ...v, name: e.target.value }))} />
        <input className={inputCls} placeholder={t.menu.description} value={newItem.description} onChange={(e) => setNewItem((v) => ({ ...v, description: e.target.value }))} />
        <input className={inputCls} type="number" step="0.01" placeholder={t.menu.price} value={newItem.price} onChange={(e) => setNewItem((v) => ({ ...v, price: e.target.value }))} />
        <input className={inputCls} type="number" placeholder={t.menu.order} value={newItem.sort_order} onChange={(e) => setNewItem((v) => ({ ...v, sort_order: e.target.value }))} />
        <button disabled={savingId === 'new'} onClick={createItem} className="bg-[#4d7ea8]/45 border border-[#8fd0ff]/30 text-white text-xs px-3 py-2 uppercase tracking-[0.15em] disabled:opacity-40">
          {t.menu.add}
        </button>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className="text-white/70 text-xs">{t.common.loading}</div>
        ) : grouped.length === 0 ? (
          <div className="text-white/60 text-xs">{t.menu.noRows}</div>
        ) : (
          grouped.map(([category, rows]) => (
            <div key={category} className="border border-white/15 bg-[#101c2d]">
              <div className="px-4 py-3 border-b border-white/10 text-white font-medium">{category}</div>
              <div className="p-4 space-y-2">
                <div className="hidden md:grid md:grid-cols-12 gap-2 items-center px-1 pb-1">
                  <p className="md:col-span-2 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.name}</p>
                  <p className="md:col-span-4 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.description}</p>
                  <p className="md:col-span-2 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.category}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.price}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.order}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.menu.active}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.3em] uppercase text-white/45">{t.common.action}</p>
                </div>
                {rows.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input className={inputCls + ' md:col-span-2'} value={item.name || ''} onChange={(e) => setItemField(item.id, 'name', e.target.value)} />
                    <input className={inputCls + ' md:col-span-4'} value={item.description || ''} onChange={(e) => setItemField(item.id, 'description', e.target.value)} />
                    <input className={inputCls + ' md:col-span-2'} value={item.category || ''} onChange={(e) => setItemField(item.id, 'category', e.target.value)} />
                    <input className={inputCls + ' md:col-span-1'} type="number" step="0.01" value={item.price} onChange={(e) => setItemField(item.id, 'price', e.target.value)} />
                    <input className={inputCls + ' md:col-span-1'} type="number" value={item.sort_order} onChange={(e) => setItemField(item.id, 'sort_order', e.target.value)} />
                    <label className="md:col-span-1 text-white/80 text-xs flex items-center gap-1">
                      <input type="checkbox" checked={Boolean(item.is_active)} onChange={(e) => setItemField(item.id, 'is_active', e.target.checked)} />
                      {t.menu.active}
                    </label>
                    <div className="md:col-span-1 flex gap-2">
                      <button disabled={!item._dirty || savingId === item.id} onClick={() => saveItem(item)} className="text-[10px] px-2 py-1 border border-[#8fd0ff]/40 text-[#8fd0ff] uppercase disabled:opacity-30">
                        {t.menu.save}
                      </button>
                      <button disabled={savingId === item.id} onClick={() => removeItem(item.id)} className="text-[10px] px-2 py-1 border border-red-400/50 text-red-300 uppercase disabled:opacity-30">
                        {t.menu.delete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
