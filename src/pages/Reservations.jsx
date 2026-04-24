import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { tForLang, localeFor } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { API_BASE } from '../lib/apiBase'
const SLOT_TIMES = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

function ListModeBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 border transition-colors rounded-sm ${
        active
          ? 'bg-[#4d7ea8]/30 border-[#8fd0ff] text-white'
          : 'border-white/20 text-white/75 hover:border-white/40 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

const STATUS_CLS = {
  confirmed: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  cancelled: 'bg-red-500/20 text-red-200 border-red-400/40',
}

function Badge({ status, text }) {
  return (
    <span className={`inline-flex text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 border ${STATUS_CLS[status] ?? 'bg-white/10 text-white/80 border-white/30'}`}>
      {text}
    </span>
  )
}

function Th({ children, sorted, dir, onClick }) {
  return (
    <th
      onClick={onClick}
      className="text-left text-[9px] tracking-[0.35em] uppercase text-white/60 pb-3 pr-5 font-normal whitespace-nowrap select-none cursor-pointer hover:text-white transition-colors"
    >
      {children}
      {sorted && <span className="ml-1 text-[#8fd0ff]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

function RatingButtons({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-8 h-8 border text-xs font-semibold transition-colors ${
            n === value
              ? 'bg-[#8fd0ff] text-[#09111d] border-[#8fd0ff]'
              : 'bg-white/[0.04] text-white/75 border-white/20 hover:border-white/40 hover:text-white'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, tone = 'default' }) {
  const toneCls = tone === 'good'
    ? 'text-emerald-300'
    : tone === 'warn'
      ? 'text-red-300'
      : tone === 'accent'
        ? 'text-[#8fd0ff]'
        : 'text-white'

  return (
    <div className="border border-white/15 bg-[#101c2d] px-4 py-3">
      <p className={`text-2xl font-display italic ${toneCls}`}>{value}</p>
      <p className="text-[9px] text-white/70 tracking-[0.22em] uppercase">{label}</p>
    </div>
  )
}

export default function Reservations() {
  const { lang } = useOutletContext()
  const t = tForLang(lang)
  const locale = localeFor(lang)

  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')
  /** 'all' | 'today' | 'month' | 'date' — which slice to load from the API */
  const [listMode, setListMode] = useState('all')
  const [listPickDate, setListPickDate] = useState(todayIso)
  const [sort, setSort] = useState({ key: 'reservation_datetime', dir: 'desc' })

  const [confirmCancel, setConfirmCancel] = useState(null)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [savingRating, setSavingRating] = useState(false)
  const [slotDate, setSlotDate] = useState(todayIso())
  const [slotTime, setSlotTime] = useState('19:00')
  const [slotInfo, setSlotInfo] = useState(null)
  const [slotLoading, setSlotLoading] = useState(false)
  const [opsNowSlot, setOpsNowSlot] = useState(null)
  const [opsNextSlot, setOpsNextSlot] = useState(null)

  const reservationsListUrl = useCallback(() => {
    if (listMode === 'today') {
      return `${API_BASE}/reservations?date=${encodeURIComponent(todayIso())}`
    }
    if (listMode === 'month') {
      const { from, to } = firstLastOfMonth()
      return `${API_BASE}/reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    }
    if (listMode === 'date') {
      const d = listPickDate || todayIso()
      return `${API_BASE}/reservations?date=${encodeURIComponent(d)}`
    }
    return `${API_BASE}/reservations`
  }, [listMode, listPickDate])

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    fetchJson(reservationsListUrl())
      .then((rows) => {
        setAll(rows)
        if (!silent) setError('')
      })
      .catch((e) => {
        if (!silent) setError(e.message || t.reservations.loadErr)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [reservationsListUrl, t.reservations.loadErr])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!slotDate || !slotTime) {
      setSlotInfo(null)
      return
    }

    let cancelled = false
    setSlotLoading(true)
    fetchJson(`${API_BASE}/reservations/slot-load?date=${encodeURIComponent(slotDate)}&time=${encodeURIComponent(slotTime)}`)
      .then((payload) => {
        if (!cancelled) setSlotInfo(payload)
      })
      .catch(() => {
        if (!cancelled) setSlotInfo(null)
      })
      .finally(() => {
        if (!cancelled) setSlotLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slotDate, slotTime])

  const refreshOpsSlots = useCallback(() => {
    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const thisHour = `${String(now.getHours()).padStart(2, '0')}:00`
    const nextHourDate = new Date(now.getTime() + 60 * 60 * 1000)
    const nextHour = `${String(nextHourDate.getHours()).padStart(2, '0')}:00`
    return Promise.all([
      fetchJson(`${API_BASE}/reservations/slot-load?date=${encodeURIComponent(day)}&time=${encodeURIComponent(thisHour)}`),
      fetchJson(`${API_BASE}/reservations/slot-load?date=${encodeURIComponent(day)}&time=${encodeURIComponent(nextHour)}`),
    ])
      .then(([nowSlot, nextSlot]) => {
        setOpsNowSlot(nowSlot)
        setOpsNextSlot(nextSlot)
      })
      .catch(() => {
        setOpsNowSlot(null)
        setOpsNextSlot(null)
      })
  }, [])

  useEffect(() => {
    refreshOpsSlots()
  }, [refreshOpsSlots])

  const cancel = async (id) => {
    try {
      await fetchJson(`${API_BASE}/reservations/${id}`, { method: 'DELETE' })
      setConfirmCancel(null)
      setSelectedReservation((prev) => (prev?.id === id ? { ...prev, status: 'cancelled' } : prev))
      load()
    } catch (e) {
      setError(e.message || t.common.error)
    }
  }

  const saveRating = async (clientId, rating) => {
    if (!clientId) return
    setSavingRating(true)
    try {
      await fetchJson(`${API_BASE}/clients/${clientId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      setAll((prev) => prev.map((r) => (
        r.client_id === clientId ? { ...r, client_rating: rating } : r
      )))
      setSelectedReservation((prev) => (prev ? { ...prev, client_rating: rating } : prev))
    } catch (e) {
      setError(e.message || t.common.error)
    } finally {
      setSavingRating(false)
    }
  }

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const normalized = useMemo(() => all.map((r) => {
    const reservationTime = (r.reservation_time || '').slice(0, 5)
    const reservationDate = typeof r.reservation_date === 'string'
      ? r.reservation_date.slice(0, 10)
      : ''
    const reservationDatetime = new Date(`${reservationDate}T${reservationTime || '00:00'}:00`)
    const adults = Number(r.adults ?? r.guests ?? 0) || 0
    const kids = Number(r.kids ?? 0) || 0
    const guests = Number(r.guests) || adults + kids

    return {
      ...r,
      adults_num: adults,
      kids_num: kids,
      guests_num: guests,
      reservation_date_iso: reservationDate,
      reservation_time_hhmm: reservationTime,
      reservation_datetime: reservationDatetime,
      created_at_dt: r.created_at ? new Date(r.created_at) : null,
      full_name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    }
  }), [all])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return normalized
      .filter((r) => {
        if (statusF !== 'all' && r.status !== statusF) return false
        if (q && ![r.first_name, r.last_name, r.email, r.phone]
          .some((f) => f?.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => {
        const sorters = {
          reservation_datetime: () => a.reservation_datetime - b.reservation_datetime,
          created_at: () => (a.created_at_dt || 0) - (b.created_at_dt || 0),
          first_name: () => a.full_name.localeCompare(b.full_name),
          guests: () => a.guests_num - b.guests_num,
          status: () => (a.status || '').localeCompare(b.status || ''),
          rating: () => (Number(a.client_rating) || 0) - (Number(b.client_rating) || 0),
        }
        const cmp = (sorters[sort.key] || (() => 0))()
        return sort.dir === 'asc' ? cmp : -cmp
      })
  }, [normalized, search, statusF, sort])

  const active = filtered.filter((r) => r.status !== 'cancelled').length
  const cancelled = filtered.filter((r) => r.status === 'cancelled').length
  const avgGuests = filtered.length
    ? (filtered.reduce((sum, r) => sum + r.guests_num, 0) / filtered.length).toFixed(1)
    : '0.0'
  const nextUpcoming = normalized
    .filter((r) => r.status !== 'cancelled' && !Number.isNaN(r.reservation_datetime.getTime()) && r.reservation_datetime >= new Date())
    .sort((a, b) => a.reservation_datetime - b.reservation_datetime)[0] || null

  const inputCls =
    'bg-white/[0.08] border border-white/20 text-white text-xs px-3 py-2 outline-none ' +
    'focus:border-[#8fd0ff] transition-colors placeholder:text-white/40 rounded-sm'

  const resetFilters = () => {
    setSearch('')
    setStatusF('all')
  }

  return (
    <div className="space-y-5 p-4 pb-10 sm:space-y-6 sm:p-6 md:p-8">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] tracking-[0.25em] text-[#8fd0ff] uppercase sm:tracking-[0.4em]">{t.reservations.panel}</p>
        <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">{t.reservations.title}</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={t.common.active} value={active} tone="good" />
        <KpiCard label={t.common.cancelled} value={cancelled} tone="warn" />
        <KpiCard label={t.common.all} value={filtered.length} />
        <KpiCard label={t.common.avgGuests} value={avgGuests} tone="accent" />
      </div>

      <div className="border border-white/15 bg-[#0b1522] p-4 space-y-3">
        <p className="text-[10px] tracking-[0.35em] uppercase text-white/50">{t.reservations.listPeriod}</p>
        <div className="flex flex-wrap items-center gap-2">
          <ListModeBtn
            active={listMode === 'today' || (listMode === 'date' && listPickDate === todayIso())}
            onClick={() => { setListMode('today'); setListPickDate(todayIso()) }}
          >
            {t.reservations.listToday}
          </ListModeBtn>
          <ListModeBtn active={listMode === 'month'} onClick={() => setListMode('month')}>
            {t.reservations.listMonth}
          </ListModeBtn>
          <ListModeBtn
            active={listMode === 'date' && listPickDate !== todayIso()}
            onClick={() => { setListMode('date') }}
          >
            {t.reservations.listByDate}
          </ListModeBtn>
          <input
            type="date"
            value={listPickDate}
            onChange={(e) => { setListPickDate(e.target.value); setListMode('date') }}
            className={inputCls + ' [color-scheme:dark]'}
            title={t.reservations.from}
          />
          <ListModeBtn active={listMode === 'all'} onClick={() => setListMode('all')}>
            {t.reservations.listAll}
          </ListModeBtn>
        </div>
      </div>

      <div className="border border-white/15 bg-[#101c2d] p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          placeholder={t.reservations.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + ' col-span-2 md:col-span-2'}
        />
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className={inputCls + ' bg-[#101c2d] cursor-pointer'}>
          <option value="all">{t.reservations.statusAll}</option>
          <option value="confirmed">{t.reservations.statusConfirmed}</option>
          <option value="cancelled">{t.reservations.statusCancelled}</option>
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="border border-white/30 text-white/80 hover:text-white hover:border-white/50 text-[10px] uppercase tracking-[0.18em] px-3 py-2 transition-colors"
        >
          {t.common.clearFilters}
        </button>
        <button
          type="button"
          onClick={() => { load(); refreshOpsSlots() }}
          className="border border-white/30 text-white/80 hover:text-white hover:border-white/50 text-[10px] uppercase tracking-[0.18em] px-3 py-2 transition-colors"
        >
          {t.common.refresh}
        </button>
        <input
          type="date"
          value={slotDate}
          onChange={(e) => setSlotDate(e.target.value)}
          className={inputCls + ' [color-scheme:dark]'}
          title={t.reservations.slotDate}
        />
        <select
          value={slotTime}
          onChange={(e) => setSlotTime(e.target.value)}
          className={inputCls + ' bg-[#101c2d] cursor-pointer'}
          title={t.reservations.slotTime}
        >
          {SLOT_TIMES.map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        <div className="col-span-2 md:col-span-4 border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/40">{t.reservations.slotControl}</p>
          <p className={`text-sm mt-1 ${slotInfo?.can_accept_request ? 'text-emerald-300' : 'text-amber-300'}`}>
            {slotLoading && t.common.loading}
            {!slotLoading && slotInfo && (
              slotInfo.applies_cap
                ? `${t.reservations.slotSummary}: ${slotInfo.current_guests}/${slotInfo.slot_cap_guests ?? '—'} ${t.common.people}`
                : `${t.reservations.slotSummary}: ${slotInfo.current_guests} ${t.common.people} — ${t.reservations.slotCrmNoCap}`
            )}
            {!slotLoading && !slotInfo && t.dashboard.slotUnavailable}
          </p>
          {!slotLoading && slotInfo?.applies_cap && !slotInfo.can_accept_request && (
            <p className="text-xs text-amber-300/85 mt-1">{t.reservations.slotFullHint}</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="border border-white/15 bg-[#101c2d] px-4 py-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/45">{t.reservations.nowSlot}</p>
          <p className="text-lg text-emerald-300 font-semibold mt-1">
            {opsNowSlot
              ? (opsNowSlot.applies_cap
                ? `${opsNowSlot.current_guests}/${opsNowSlot.slot_cap_guests ?? '—'}`
                : String(opsNowSlot.current_guests))
              : '—'}
          </p>
          <p className="text-[11px] text-white/60">{opsNowSlot?.time || '—'}</p>
        </div>
        <div className="border border-white/15 bg-[#101c2d] px-4 py-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/45">{t.reservations.nextHourSlot}</p>
          <p className="text-lg text-[#8fd0ff] font-semibold mt-1">
            {opsNextSlot
              ? (opsNextSlot.applies_cap
                ? `${opsNextSlot.current_guests}/${opsNextSlot.slot_cap_guests ?? '—'}`
                : String(opsNextSlot.current_guests))
              : '—'}
          </p>
          <p className="text-[11px] text-white/60">{opsNextSlot?.time || '—'}</p>
        </div>
        <div className="border border-white/15 bg-[#101c2d] px-4 py-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/45">{t.reservations.nextReservation}</p>
          <p className="text-sm text-white mt-1">
            {nextUpcoming
              ? `${nextUpcoming.reservation_time_hhmm} · ${nextUpcoming.full_name} (${nextUpcoming.guests_num})`
              : t.dashboard.noUpcoming}
          </p>
          <p className="text-[11px] text-white/60">
            {nextUpcoming
              ? new Date(nextUpcoming.reservation_date_iso + 'T12:00:00').toLocaleDateString(locale, {
                weekday: 'short', day: '2-digit', month: '2-digit',
              })
              : '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 border border-red-400/40 bg-red-500/15 text-red-100 text-sm">{t.common.error}: {error}</div>
      )}

      <div className="border border-white/15 bg-[#101c2d] min-w-0">
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
            <table className="w-full text-sm min-w-[980px]">
              <thead className="border-b border-white/15 bg-[#0b1522]">
                <tr>
                  <td className="w-5" />
                  <Th sorted={sort.key === 'reservation_datetime'} dir={sort.dir} onClick={() => toggleSort('reservation_datetime')}>{t.common.date} & {t.common.time}</Th>
                  <Th sorted={sort.key === 'first_name'} dir={sort.dir} onClick={() => toggleSort('first_name')}>{t.common.name}</Th>
                  <Th>{t.common.contact}</Th>
                  <Th sorted={sort.key === 'guests'} dir={sort.dir} onClick={() => toggleSort('guests')}>{t.common.totalGuests}</Th>
                  <Th sorted={sort.key === 'created_at'} dir={sort.dir} onClick={() => toggleSort('created_at')}>{t.common.created}</Th>
                  <Th sorted={sort.key === 'rating'} dir={sort.dir} onClick={() => toggleSort('rating')}>{t.common.rating}</Th>
                  <Th sorted={sort.key === 'status'} dir={sort.dir} onClick={() => toggleSort('status')}>{t.common.status}</Th>
                  <Th>{t.common.action}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-white/10 hover:bg-[#18273d] transition-colors ${r.status === 'cancelled' ? 'opacity-60' : ''}`}
                  >
                    <td className="pl-6 py-3.5 text-white/40 text-[10px] tabular-nums">#{r.id}</td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white text-xs tabular-nums">
                        {new Date(r.reservation_date_iso + 'T12:00:00').toLocaleDateString(locale, {
                          weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </p>
                      <p className="text-[#8fd0ff] text-[11px] tabular-nums font-medium">{r.reservation_time_hhmm}</p>
                    </td>
                    <td className="py-3.5 pr-5 max-w-[190px]">
                      <p className="text-white text-xs font-medium truncate" title={r.full_name}>{r.full_name}</p>
                    </td>
                    <td className="py-3.5 pr-5 max-w-[230px]">
                      <p className="text-white/85 text-[11px] truncate" title={r.email}>{r.email}</p>
                      <p className="text-white/60 text-[10px] truncate" title={r.phone}>{r.phone}</p>
                    </td>
                    <td className="py-3.5 pr-5 text-xs">
                      <p className="text-white">{r.guests_num}</p>
                      <p className="text-white/60 text-[10px]">{r.adults_num}A / {r.kids_num}K</p>
                    </td>
                    <td className="py-3.5 pr-5 text-white/75 text-[11px] tabular-nums">
                      {r.created_at_dt
                        ? r.created_at_dt.toLocaleString(locale, {
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                        })
                        : '—'}
                    </td>
                    <td className="py-3.5 pr-5 text-white/90 text-xs">{r.client_rating ? `${r.client_rating}/5` : '—'}</td>
                    <td className="py-3.5 pr-5">
                      <Badge
                        status={r.status}
                        text={r.status === 'cancelled' ? t.reservations.statusCancelled : t.reservations.statusConfirmed}
                      />
                    </td>
                    <td className="py-3.5 pr-6 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReservation(r)}
                        className="text-[9px] tracking-[0.2em] uppercase text-[#8fd0ff] hover:text-white transition-colors cursor-pointer"
                      >
                        {t.common.details}
                      </button>
                      {r.status !== 'cancelled' && (
                        <button
                          onClick={() => setConfirmCancel(r.id)}
                          className="text-[9px] tracking-[0.2em] uppercase text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                        >
                          {t.reservations.cancelBtn}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedReservation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#101c2d] border border-white/20 p-6 md:p-8 max-w-xl w-full mx-4 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display italic text-2xl text-white">{t.reservations.detailsTitle}</h3>
              <button onClick={() => setSelectedReservation(null)} className="text-white/60 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.id}</p><p className="text-white">#{selectedReservation.id}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.status}</p><p className="text-white">{selectedReservation.status}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.name}</p><p className="text-white">{selectedReservation.full_name}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.contact}</p><p className="text-white">{selectedReservation.email}<br />{selectedReservation.phone}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.date}</p><p className="text-white">{new Date(selectedReservation.reservation_date_iso + 'T12:00:00').toLocaleDateString(locale)}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.time}</p><p className="text-white">{selectedReservation.reservation_time_hhmm}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.adults}</p><p className="text-white">{selectedReservation.adults_num}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.kids}</p><p className="text-white">{selectedReservation.kids_num}</p></div>
              <div><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.totalGuests}</p><p className="text-white">{selectedReservation.guests_num}</p></div>
              <div className="col-span-2"><p className="text-white/60 text-xs uppercase tracking-wider">{t.common.notes}</p><p className="text-white">{selectedReservation.special_needs || t.common.noNotes}</p></div>
            </div>

            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-2">{t.common.rating}</p>
              <RatingButtons
                value={Number(selectedReservation.client_rating) || 3}
                onChange={(value) => saveRating(selectedReservation.client_id, value)}
              />
              {savingRating && <p className="text-[11px] text-white/70 mt-2">{t.common.loading}</p>}
            </div>
          </div>
        </div>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#101c2d] border border-white/20 p-8 max-w-sm w-full mx-4 space-y-5">
            <div>
              <h3 className="font-display italic text-2xl text-white">{t.reservations.cancelTitle}</h3>
              <p className="text-white/75 text-sm mt-2">{t.reservations.cancelWarn}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => cancel(confirmCancel)}
                className="flex-1 py-3 bg-red-500/25 border border-red-400/40 text-red-100 text-xs tracking-[0.2em] uppercase hover:bg-red-500/35 transition-colors cursor-pointer"
              >
                {t.reservations.confirmCancel}
              </button>
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 py-3 border border-white/30 text-white/80 text-xs tracking-[0.2em] uppercase hover:text-white hover:border-white/50 transition-colors cursor-pointer"
              >
                {t.reservations.abortCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
