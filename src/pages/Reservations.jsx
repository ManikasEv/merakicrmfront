import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { tForLang, localeFor } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { API_BASE } from '../lib/apiBase'

const SLOT_TIMES = [
  '11:00', '11:30', '12:00', '12:30', '13:00',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
]

const inputCls =
  'bg-white/[0.08] border border-white/20 text-white text-xs px-3 py-2 outline-none ' +
  'focus:border-[#8fd0ff] transition-colors placeholder:text-white/40 rounded-sm [color-scheme:dark]'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function firstLastOfMonth() {
  const d = new Date()
  const y = d.getFullYear()
  const mon = d.getMonth()
  const from = `${y}-${String(mon + 1).padStart(2, '0')}-01`
  const last = new Date(y, mon + 1, 0).getDate()
  const to = `${y}-${String(mon + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

function nextHourSlot() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 60)
  const snapped = Math.floor(d.getMinutes() / 30) * 30
  d.setMinutes(snapped, 0, 0)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const candidate = `${hh}:${mm}`
  return SLOT_TIMES.includes(candidate) ? candidate : SLOT_TIMES.find((t) => t > candidate) || SLOT_TIMES[SLOT_TIMES.length - 1]
}

function nowSlot() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = d.getMinutes() < 30 ? '00' : '30'
  const candidate = `${hh}:${mm}`
  return SLOT_TIMES.includes(candidate) ? candidate : SLOT_TIMES[0]
}

function KpiCard({ label, value, tone = 'default' }) {
  const toneCls = tone === 'good'
    ? 'text-emerald-300'
    : tone === 'warn'
      ? 'text-amber-300'
      : tone === 'accent'
        ? 'text-[#8fd0ff]'
        : 'text-white'
  return (
    <div className="border border-white/15 bg-[#0b1522] px-4 py-3">
      <p className={`text-2xl font-semibold leading-none ${toneCls}`}>{value}</p>
      <p className="text-[9px] tracking-[0.28em] uppercase text-white/50 mt-2">{label}</p>
    </div>
  )
}

function statusClass(status) {
  if (status === 'cancelled') return 'text-amber-300/90'
  return 'text-emerald-300/90'
}

export default function Reservations() {
  const { lang } = useOutletContext()
  const t = tForLang(lang)
  const locale = localeFor(lang)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [period, setPeriod] = useState('today')
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)
  const [slotDate, setSlotDate] = useState(todayIso)
  const [slotTime, setSlotTime] = useState(nowSlot)
  const [slotInfo, setSlotInfo] = useState(null)
  const [filterToSlot, setFilterToSlot] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [details, setDetails] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    const qp = new URLSearchParams()
    if (period === 'today') {
      qp.set('date', todayIso())
    } else if (period === 'month') {
      const m = firstLastOfMonth()
      qp.set('from', m.from)
      qp.set('to', m.to)
    } else if (period === 'date') {
      qp.set('date', from || todayIso())
    } else if (period === 'all') {
      if (from) qp.set('from', from)
      if (to) qp.set('to', to)
    }
    const suffix = qp.toString() ? `?${qp.toString()}` : ''
    fetchJson(`${API_BASE}/reservations${suffix}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setRows(list.map((r) => ({
          ...r,
          reservation_date_iso: String(r.reservation_date || '').slice(0, 10),
          reservation_time_hhmm: String(r.reservation_time || '').slice(0, 5),
        })))
        if (!silent) setError('')
      })
      .catch((e) => {
        if (!silent) setError(e.message || t.reservations.loadErr)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [period, from, to, t.reservations.loadErr])

  const loadSlot = useCallback(() => {
    const qp = new URLSearchParams({ date: slotDate, time: slotTime, guests: '1' })
    fetchJson(`${API_BASE}/reservations/slot-load?${qp.toString()}`)
      .then(setSlotInfo)
      .catch(() => setSlotInfo(null))
  }, [slotDate, slotTime])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadSlot() }, [loadSlot])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== 'all' && String(r.status || 'confirmed') !== status) return false
      if (filterToSlot) {
        if (r.reservation_date_iso !== slotDate) return false
        if (r.reservation_time_hhmm !== slotTime) return false
      }
      if (!q) return true
      return [r.first_name, r.last_name, r.email, r.phone, String(r.id)].some((v) => (
        String(v || '').toLowerCase().includes(q)
      ))
    })
  }, [rows, search, status, filterToSlot, slotDate, slotTime])

  const active = filtered.filter((r) => r.status !== 'cancelled').length
  const cancelled = filtered.filter((r) => r.status === 'cancelled').length
  const avgGuests = filtered.length
    ? Math.round(filtered.reduce((sum, r) => sum + (Number(r.guests) || 0), 0) / filtered.length)
    : 0

  const nextReservation = useMemo(() => {
    const now = new Date()
    return filtered
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({ ...r, at: new Date(`${r.reservation_date_iso}T${r.reservation_time_hhmm || '00:00'}:00`) }))
      .filter((r) => !Number.isNaN(r.at.getTime()) && r.at >= now)
      .sort((a, b) => a.at - b.at)[0] || null
  }, [filtered])

  const cancelReservation = async () => {
    if (!cancelTarget?.id) return
    setBusyId(cancelTarget.id)
    try {
      await fetchJson(`${API_BASE}/reservations/${cancelTarget.id}`, { method: 'DELETE' })
      setRows((prev) => prev.map((r) => (r.id === cancelTarget.id ? { ...r, status: 'cancelled' } : r)))
      setCancelTarget(null)
      loadSlot()
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setBusyId(null)
    }
  }

  const saveRating = async (clientId, rating) => {
    if (!clientId) return
    try {
      await fetchJson(`${API_BASE}/clients/${clientId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      setRows((prev) => prev.map((r) => (r.client_id === clientId ? { ...r, client_rating: rating } : r)))
    } catch (e) {
      setError(e.message || t.common.error)
    }
  }

  const statusLabel = (value) => {
    if (value === 'cancelled') return t.reservations.statusCancelled
    return t.reservations.statusConfirmed
  }

  return (
    <div className="space-y-5 p-4 pb-10 sm:space-y-6 sm:p-6 md:p-8">
      <div className="flex flex-col gap-3 min-[500px]:flex-row min-[500px]:items-end min-[500px]:justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] tracking-[0.25em] text-[#8fd0ff] uppercase sm:tracking-[0.4em]">{t.reservations.panel}</p>
          <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">{t.reservations.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => { load(); loadSlot() }}
          className="text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-white/25 text-white/80 hover:border-[#8fd0ff] hover:text-white transition-colors rounded-sm w-fit"
        >
          {t.common.refresh}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={t.common.active} value={active} tone="good" />
        <KpiCard label={t.common.cancelled} value={cancelled} tone="warn" />
        <KpiCard label={t.common.all} value={filtered.length} />
        <KpiCard label={t.common.avgGuests} value={avgGuests} tone="accent" />
      </div>

      <div className="border border-white/15 bg-[#101c2d] p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            ['today', t.reservations.listToday],
            ['month', t.reservations.listMonth],
            ['date', t.reservations.listByDate],
            ['all', t.reservations.listAll],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPeriod(id)
                if (id === 'today') { setFrom(todayIso()); setTo(todayIso()) }
                if (id === 'month') {
                  const m = firstLastOfMonth()
                  setFrom(m.from)
                  setTo(m.to)
                }
                if (id === 'all') { setFrom(''); setTo('') }
              }}
              className={`text-[10px] tracking-[0.18em] uppercase px-3 py-2 border rounded-sm ${
                period === id ? 'border-[#8fd0ff] text-white bg-[#4d7ea8]/30' : 'border-white/20 text-white/70 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder={t.reservations.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + ' w-full md:w-72'}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="all">{t.reservations.statusAll}</option>
            <option value="confirmed">{t.reservations.statusConfirmed}</option>
            <option value="cancelled">{t.reservations.statusCancelled}</option>
          </select>
          {period === 'date' && (
            <>
              <label className="text-[10px] uppercase tracking-widest text-white/40">{t.reservations.from}</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setTo(e.target.value) }} className={inputCls} />
            </>
          )}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/45">{t.reservations.slotControl}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[10px] uppercase tracking-widest text-white/40">{t.reservations.slotDate}</label>
            <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className={inputCls} />
            <label className="text-[10px] uppercase tracking-widest text-white/40">{t.reservations.slotTime}</label>
            <select value={slotTime} onChange={(e) => setSlotTime(e.target.value)} className={inputCls}>
              {SLOT_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
            <button type="button" onClick={() => { setSlotDate(todayIso()); setSlotTime(nowSlot()) }} className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 border border-white/20 text-white/70 hover:text-white rounded-sm">
              {t.reservations.nowSlot}
            </button>
            <button type="button" onClick={() => { setSlotDate(todayIso()); setSlotTime(nextHourSlot()) }} className="text-[10px] tracking-[0.18em] uppercase px-3 py-2 border border-white/20 text-white/70 hover:text-white rounded-sm">
              {t.reservations.nextHourSlot}
            </button>
            <label className="flex items-center gap-2 text-[11px] text-white/70">
              <input type="checkbox" checked={filterToSlot} onChange={(e) => setFilterToSlot(e.target.checked)} />
              {t.reservations.filterListToSlot}
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-white/70">
            <span>{t.reservations.selectedSlotKpi}: <strong className="text-white">{slotDate} · {slotTime}</strong></span>
            <span>{t.reservations.slotSummary}: <strong className="text-[#8fd0ff]">{slotInfo?.current_guests ?? '—'}</strong></span>
            {slotInfo?.applies_cap ? (
              <span>{t.reservations.slotSummary}: {slotInfo.remaining_guests}/{slotInfo.slot_cap_guests}</span>
            ) : (
              <span>{t.reservations.slotCrmNoCap}</span>
            )}
            {nextReservation && (
              <span>{t.reservations.nextReservation}: {nextReservation.first_name} {nextReservation.last_name} · {nextReservation.reservation_time_hhmm}</span>
            )}
          </div>
          {slotInfo?.at_capacity && (
            <p className="text-[11px] text-amber-300/90">{t.reservations.slotFullHint}</p>
          )}
        </div>
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
          <p className="text-center py-16 text-white/60 text-xs tracking-widest uppercase">{t.reservations.noRows}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-white/15 bg-[#0b1522]">
                <tr>
                  {[t.common.id, t.common.date, t.common.time, t.common.name, t.common.contact, t.common.guests, t.common.status, t.common.action].map((h) => (
                    <th key={h} className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 py-3 pr-5 first:pl-6 last:pr-6 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/10 hover:bg-[#18273d] transition-colors">
                    <td className="pl-6 py-3.5 pr-5 text-white/40 text-xs tabular-nums">#{r.id}</td>
                    <td className="py-3.5 pr-5 text-white/80 text-xs tabular-nums">
                      {r.reservation_date_iso
                        ? new Date(`${r.reservation_date_iso}T12:00:00`).toLocaleDateString(locale, {
                          weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit',
                        })
                        : '—'}
                    </td>
                    <td className="py-3.5 pr-5 text-[#8fd0ff] text-xs tabular-nums font-medium">{r.reservation_time_hhmm || '—'}</td>
                    <td className="py-3.5 pr-5 text-white text-xs">{r.first_name} {r.last_name}</td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white/85 text-[11px]">{r.email}</p>
                      <p className="text-white/60 text-[10px]">{r.phone}</p>
                    </td>
                    <td className="py-3.5 pr-5 text-white/80 text-xs">{r.guests}</td>
                    <td className={`py-3.5 pr-5 text-xs ${statusClass(r.status)}`}>{statusLabel(r.status)}</td>
                    <td className="py-3.5 pr-6">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setDetails(r)} className="text-[10px] tracking-[0.16em] uppercase text-white/60 hover:text-white">
                          {t.common.details}
                        </button>
                        {r.status !== 'cancelled' && (
                          <button type="button" onClick={() => setCancelTarget(r)} className="text-[10px] tracking-[0.16em] uppercase text-amber-300/80 hover:text-amber-200">
                            {t.reservations.cancelBtn}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {details && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetails(null)}>
          <div className="w-full max-w-lg border border-white/15 bg-[#101c2d] p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#8fd0ff]">{t.reservations.detailsTitle}</p>
            <p className="text-white text-lg">{details.first_name} {details.last_name}</p>
            <p className="text-white/70 text-sm">{details.email} · {details.phone}</p>
            <p className="text-white/80 text-sm">{details.reservation_date_iso} · {details.reservation_time_hhmm} · {details.guests} {t.common.people}</p>
            <p className="text-white/50 text-xs">{t.common.adults}: {details.adults ?? '—'} · {t.common.kids}: {details.kids ?? '—'}</p>
            <p className="text-white/50 text-xs">{t.common.notes}: {details.special_needs || t.common.noNotes}</p>
            {details.client_id && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] uppercase tracking-widest text-white/40">{t.common.rating}</span>
                <select
                  value={Number(details.client_rating) || 3}
                  onChange={(e) => saveRating(details.client_id, Number(e.target.value))}
                  className={inputCls}
                >
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                </select>
              </div>
            )}
            <button type="button" onClick={() => setDetails(null)} className="mt-2 text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-white/20 text-white/70 hover:text-white rounded-sm">
              {t.reservations.abortCancel}
            </button>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setCancelTarget(null)}>
          <div className="w-full max-w-md border border-white/15 bg-[#101c2d] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-lg">{t.reservations.cancelTitle}</p>
            <p className="text-white/60 text-sm">{t.reservations.cancelWarn}</p>
            <p className="text-white/80 text-sm">#{cancelTarget.id} · {cancelTarget.first_name} {cancelTarget.last_name}</p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busyId === cancelTarget.id}
                onClick={cancelReservation}
                className="text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 bg-amber-500/20 border border-amber-300/40 text-amber-100 rounded-sm disabled:opacity-40"
              >
                {busyId === cancelTarget.id ? t.common.loading : t.reservations.confirmCancel}
              </button>
              <button type="button" onClick={() => setCancelTarget(null)} className="text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 border border-white/20 text-white/70 rounded-sm">
                {t.reservations.abortCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
