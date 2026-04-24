import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { tForLang, localeFor } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { API_BASE } from '../lib/apiBase'
import { useAutoRefresh } from '../lib/useAutoRefresh'

function RatingSelect({ value, disabled, onChange }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-white/[0.08] border border-white/20 text-white text-xs px-2 py-1.5 outline-none focus:border-[#8fd0ff] rounded-sm disabled:opacity-40"
    >
      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
    </select>
  )
}

export default function Clients() {
  const { lang } = useOutletContext()
  const t = tForLang(lang)
  const locale = localeFor(lang)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    fetchJson(`${API_BASE}/clients`)
      .then((clients) => {
        setRows(clients)
        if (!silent) setError('')
      })
      .catch((e) => {
        if (!silent) setError(e.message || t.clients.loadErr)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [t.clients.loadErr])

  useEffect(() => {
    load()
  }, [load])
  useAutoRefresh(load, { intervalMs: 15000 })

  const saveRating = async (clientId, rating) => {
    if (!clientId) return
    setSavingId(clientId)
    try {
      await fetchJson(`${API_BASE}/clients/${clientId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      setRows((prev) => prev.map((c) => (c.id === clientId ? { ...c, rating } : c)))
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setSavingId(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((c) => (
      [c.first_name, c.last_name, c.email, c.phone].some((v) => String(v || '').toLowerCase().includes(q))
    ))
  }, [rows, search])

  const totalClients = filtered.length
  const totalReservations = filtered.reduce((sum, c) => sum + (Number(c.total_reservations) || 0), 0)
  const totalGuests = filtered.reduce((sum, c) => sum + (Number(c.total_guests) || 0), 0)

  const inputCls =
    'bg-white/[0.08] border border-white/20 text-white text-xs px-3 py-2 outline-none ' +
    'focus:border-[#8fd0ff] transition-colors placeholder:text-white/40 rounded-sm'

  return (
    <div className="space-y-5 p-4 pb-10 sm:space-y-6 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 min-[500px]:flex-row min-[500px]:items-end min-[500px]:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] tracking-[0.25em] text-[#8fd0ff] uppercase sm:tracking-[0.4em]">{t.clients.panel}</p>
          <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">{t.clients.title}</h1>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center min-[500px]:flex min-[500px]:gap-6 min-[500px]:text-right">
          <div>
            <p className="text-xl font-display italic text-white min-[500px]:text-2xl">{totalClients}</p>
            <p className="text-[8px] uppercase tracking-widest text-white/70 min-[500px]:text-[9px]">{t.app.clients}</p>
          </div>
          <div>
            <p className="text-xl font-display italic text-[#8fd0ff] min-[500px]:text-2xl">{totalReservations}</p>
            <p className="text-[8px] uppercase tracking-widest text-white/70 min-[500px]:text-[9px]">{t.clients.totalReservations}</p>
          </div>
          <div>
            <p className="text-xl font-display italic text-emerald-300 min-[500px]:text-2xl">{totalGuests}</p>
            <p className="text-[8px] uppercase tracking-widest text-white/70 min-[500px]:text-[9px]">{t.clients.totalGuests}</p>
          </div>
        </div>
      </div>

      <div className="border border-white/15 bg-[#101c2d] p-5">
        <input
          placeholder={t.clients.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + ' w-full md:w-80'}
        />
      </div>

      {error && (
        <div className="px-5 py-3 border border-red-400/40 bg-red-500/15 text-red-100 text-sm">
          {t.common.error}: {error}
        </div>
      )}

      <div className="border border-white/15 bg-[#101c2d]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/70 text-xs tracking-widest uppercase gap-3">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {t.common.loading}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-white/60 text-xs tracking-widest uppercase">{t.clients.noRows}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-white/15 bg-[#0b1522]">
                <tr>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 pl-6 font-normal">{t.common.name}</th>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 font-normal">{t.common.contact}</th>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 font-normal">{t.common.rating}</th>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 font-normal">{t.clients.totalReservations}</th>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 font-normal">{t.clients.totalGuests}</th>
                  <th className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-6 font-normal">{t.clients.lastReservation}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={`${c.id || c.email}`} className="border-b border-white/10 hover:bg-[#18273d] transition-colors">
                    <td className="pl-6 py-3.5 pr-5">
                      <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                    </td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white/85 text-[11px]">{c.email}</p>
                      <p className="text-white/60 text-[10px]">{c.phone}</p>
                    </td>
                    <td className="py-3.5 pr-5">
                      {c.id ? (
                        <div className="flex items-center gap-2">
                          <RatingSelect
                            value={Number(c.rating) || 3}
                            disabled={savingId === c.id}
                            onChange={(rating) => saveRating(c.id, rating)}
                          />
                          {savingId === c.id && <span className="text-[10px] text-white/60">{t.common.loading}</span>}
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/50">{t.clients.noRatingSupport}</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-5 text-white text-xs">{c.total_reservations || 0}</td>
                    <td className="py-3.5 pr-5 text-white text-xs">{c.total_guests || 0}</td>
                    <td className="py-3.5 pr-6 text-white/80 text-xs">
                      {c.last_reservation_at
                        ? new Date(c.last_reservation_at).toLocaleString(locale, {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                        })
                        : t.clients.neverVisited}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
