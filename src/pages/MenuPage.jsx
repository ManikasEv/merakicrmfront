import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { tForLang } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { API_BASE } from '../lib/apiBase'

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
  const t = tForLang(lang)

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
    fetchJson(`${API_BASE}/menu`)
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
      const saved = await fetchJson(`${API_BASE}/menu/${item.id}`, {
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
      await fetchJson(`${API_BASE}/menu/${id}`, { method: 'DELETE' })
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
      const created = await fetchJson(`${API_BASE}/menu`, {
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

  const inputCls = 'bg-white/[0.08] border border-white/20 text-white text-sm md:text-xs px-3 py-2.5 md:px-2 md:py-2 outline-none focus:border-[#8fd0ff] rounded-sm w-full min-w-0'
  const labelCls = 'text-[9px] font-medium uppercase tracking-wider text-white/50'
  const mobileLabel = (text) => <p className={labelCls}>{text}</p>

  const FieldLabel = ({ children }) => <p className={`${labelCls} md:hidden`}>{children}</p>

  const publishMenu = async () => {
    setPublishing(true)
    setPublishNotice('')
    try {
      const payload = await fetchJson(`${API_BASE}/menu/publish`, { method: 'POST' })
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
    <div className="space-y-5 p-4 pb-10 sm:space-y-6 sm:p-6 md:p-8">
      <div className="flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-end min-[400px]:justify-between">
        <div className="min-w-0 pr-0">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-[#8fd0ff] uppercase sm:tracking-[0.28em]">{t.menu.panel}</p>
          <h1 className="text-2xl font-semibold leading-tight break-words text-white sm:text-3xl md:text-4xl">{t.menu.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => load()}
            className="rounded-sm border border-white/25 px-4 py-2.5 text-[10px] font-medium tracking-[0.15em] text-white/85 uppercase hover:border-[#8fd0ff] hover:text-white"
          >
            {t.common.refresh}
          </button>
          <button
            type="button"
            disabled={publishing}
            onClick={publishMenu}
            className="rounded-sm border border-[#8fd0ff]/40 bg-[#8fd0ff]/20 px-4 py-2.5 text-xs font-medium tracking-wide text-[#b9e7ff] uppercase min-[400px]:tracking-[0.15em] disabled:opacity-40"
          >
            {publishing ? t.menu.publishing : t.menu.publish}
          </button>
        </div>
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

      <div className="min-w-0 space-y-3 border border-white/15 bg-[#101c2d] p-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2 lg:grid-cols-6">
        <div>
          <FieldLabel>{t.menu.category}</FieldLabel>
          <input className={inputCls} placeholder={t.menu.category} value={newItem.category} onChange={(e) => setNewItem((v) => ({ ...v, category: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>{t.menu.name}</FieldLabel>
          <input className={inputCls} placeholder={t.menu.name} value={newItem.name} onChange={(e) => setNewItem((v) => ({ ...v, name: e.target.value }))} />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <FieldLabel>{t.menu.description}</FieldLabel>
          <input className={inputCls} placeholder={t.menu.description} value={newItem.description} onChange={(e) => setNewItem((v) => ({ ...v, description: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>{t.menu.price}</FieldLabel>
          <input className={inputCls} type="number" step="0.01" placeholder={t.menu.price} value={newItem.price} onChange={(e) => setNewItem((v) => ({ ...v, price: e.target.value }))} />
        </div>
        <div>
          <FieldLabel>{t.menu.order}</FieldLabel>
          <input className={inputCls} type="number" placeholder={t.menu.order} value={newItem.sort_order} onChange={(e) => setNewItem((v) => ({ ...v, sort_order: e.target.value }))} />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <button
            type="button"
            disabled={savingId === 'new'}
            onClick={createItem}
            className="w-full rounded-sm border border-[#8fd0ff]/30 bg-[#4d7ea8]/45 px-3 py-2.5 text-sm font-medium uppercase tracking-wide text-white min-[400px]:text-xs min-[400px]:tracking-[0.1em] disabled:opacity-40 sm:py-2"
          >
            {t.menu.add}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className="text-white/70 text-xs">{t.common.loading}</div>
        ) : grouped.length === 0 ? (
          <div className="text-white/60 text-xs">{t.menu.noRows}</div>
        ) : (
          grouped.map(([category, rows]) => (
            <div key={category} className="border border-white/15 bg-[#101c2d]">
              <div className="border-b border-white/10 px-4 py-3 text-base font-medium break-words text-white md:text-sm">{category}</div>
              <div className="space-y-3 p-3 sm:p-4 md:space-y-2">
                <div className="hidden md:grid md:grid-cols-12 gap-2 items-end px-1 pb-1 min-w-0">
                  <p className="md:col-span-2 text-[9px] tracking-[0.2em] uppercase text-white/45 break-words">{t.menu.category}</p>
                  <p className="md:col-span-2 text-[9px] tracking-[0.2em] uppercase text-white/45 break-words">{t.menu.name}</p>
                  <p className="md:col-span-3 text-[9px] tracking-[0.2em] uppercase text-white/45 break-words">{t.menu.description}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.2em] uppercase text-white/45">{t.menu.price}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.2em] uppercase text-white/45">{t.menu.order}</p>
                  <p className="md:col-span-1 text-[9px] tracking-[0.2em] uppercase text-white/45 break-words">{t.menu.active}</p>
                  <p className="md:col-span-2 text-[9px] tracking-[0.2em] uppercase text-white/45 break-words">{t.common.action}</p>
                </div>
                {rows.map((item) => (
                  <div key={item.id} className="min-w-0">
                    <div className="space-y-3 rounded border border-white/10 bg-white/[0.04] p-3 md:hidden">
                      <div>
                        {mobileLabel(t.menu.category)}
                        <input className={inputCls} value={item.category || ''} onChange={(e) => setItemField(item.id, 'category', e.target.value)} />
                      </div>
                      <div>
                        {mobileLabel(t.menu.name)}
                        <input className={inputCls} value={item.name || ''} onChange={(e) => setItemField(item.id, 'name', e.target.value)} />
                      </div>
                      <div>
                        {mobileLabel(t.menu.description)}
                        <textarea
                          className={inputCls + ' min-h-[4.5rem] resize-y'}
                          rows={3}
                          value={item.description || ''}
                          onChange={(e) => setItemField(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          {mobileLabel(t.menu.price)}
                          <input className={inputCls} type="number" step="0.01" value={item.price} onChange={(e) => setItemField(item.id, 'price', e.target.value)} />
                        </div>
                        <div>
                          {mobileLabel(t.menu.order)}
                          <input className={inputCls} type="number" value={item.sort_order} onChange={(e) => setItemField(item.id, 'sort_order', e.target.value)} />
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-white/90">
                        <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-white/30" checked={Boolean(item.is_active)} onChange={(e) => setItemField(item.id, 'is_active', e.target.checked)} />
                        {t.menu.active}
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          disabled={!item._dirty || savingId === item.id}
                          onClick={() => saveItem(item)}
                          className="min-h-11 flex-1 rounded border border-[#8fd0ff]/40 py-2 text-xs font-medium uppercase text-[#8fd0ff] disabled:opacity-30"
                        >
                          {t.menu.save}
                        </button>
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => removeItem(item.id)}
                          className="min-h-11 flex-1 rounded border border-red-400/50 py-2 text-xs font-medium uppercase text-red-300 disabled:opacity-30"
                        >
                          {t.menu.delete}
                        </button>
                      </div>
                    </div>

                    <div className="hidden min-w-0 items-center gap-2 md:grid md:grid-cols-12">
                      <input className={inputCls + ' md:col-span-2'} value={item.category || ''} onChange={(e) => setItemField(item.id, 'category', e.target.value)} />
                      <input className={inputCls + ' md:col-span-2'} value={item.name || ''} onChange={(e) => setItemField(item.id, 'name', e.target.value)} />
                      <input className={inputCls + ' md:col-span-3'} value={item.description || ''} onChange={(e) => setItemField(item.id, 'description', e.target.value)} />
                      <input className={inputCls + ' md:col-span-1'} type="number" step="0.01" value={item.price} onChange={(e) => setItemField(item.id, 'price', e.target.value)} />
                      <input className={inputCls + ' md:col-span-1'} type="number" value={item.sort_order} onChange={(e) => setItemField(item.id, 'sort_order', e.target.value)} />
                      <label className="flex min-w-0 items-center gap-1.5 text-xs text-white/80 md:col-span-1">
                        <input type="checkbox" className="shrink-0" checked={Boolean(item.is_active)} onChange={(e) => setItemField(item.id, 'is_active', e.target.checked)} />
                        <span className="break-words">{t.menu.active}</span>
                      </label>
                      <div className="flex min-w-0 flex-wrap content-center gap-1.5 md:col-span-2">
                        <button
                          type="button"
                          disabled={!item._dirty || savingId === item.id}
                          onClick={() => saveItem(item)}
                          className="shrink-0 border border-[#8fd0ff]/40 px-2 py-1.5 text-[10px] uppercase text-[#8fd0ff] disabled:opacity-30"
                        >
                          {t.menu.save}
                        </button>
                        <button
                          type="button"
                          disabled={savingId === item.id}
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 border border-red-400/50 px-2 py-1.5 text-[10px] uppercase text-red-300 disabled:opacity-30"
                        >
                          {t.menu.delete}
                        </button>
                      </div>
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
