import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { tForLang, localeFor, monthShort } from '../lib/i18n'
import { fetchJson } from '../lib/api'
import { API_BASE } from '../lib/apiBase'
import { useAutoRefresh } from '../lib/useAutoRefresh'
const CRM_MUTATE_SECRET = import.meta.env.VITE_CRM_MUTATE_SECRET || ''

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── helpers ────────────────────────────────────────────────────────────────
function fmtHour(h) {
  return `${String(h).padStart(2, '0')}:00`
}

// ── Custom tooltip ─────────────────────────────────────────────────────────
function CTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="value" style={{ color: p.color }}>
          {p.name}: <strong>{p.value}{unit}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`border px-6 py-5 flex flex-col gap-1 ${
      accent ? 'border-[#4d7ea8]/70 bg-[#1a314a]' : 'border-white/15 bg-[#101c2d]'
    }`}>
      <p className="text-[9px] tracking-[0.4em] uppercase text-white/70">{label}</p>
      <p className={`text-3xl md:text-4xl font-semibold leading-none mt-1 ${accent ? 'text-[#8fd0ff]' : 'text-white'}`}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-[10px] text-white/70 mt-1">{sub}</p>}
    </div>
  )
}

function ModeBtn({ active, onClick, children }) {
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

function slotKpiFromPayload(slot, t) {
  if (!slot) return { value: '—', sub: t.dashboard.slotUnavailable }
  if (slot.applies_cap) {
    return {
      value: `${slot.current_guests}/${slot.slot_cap_guests}`,
      sub: `${slot.time} · ${t.dashboard.remaining}: ${slot.remaining_guests}`,
    }
  }
  return {
    value: String(slot.current_guests),
    sub: `${slot.time} · ${t.dashboard.slotCapOffNote}`,
  }
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="border border-white/15 bg-[#101c2d]">
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-[10px] tracking-[0.4em] uppercase text-white/70">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { lang } = useOutletContext()
  const t = tForLang(lang)
  const locale = localeFor(lang)

  const [statView, setStatView] = useState('rolling') // rolling | day | year
  const [statDate, setStatDate] = useState(todayIso)
  const [statYear, setStatYear] = useState(() => new Date().getFullYear())

  const [stats, setStats]         = useState(null)
  const [upcoming, setUpcoming]   = useState([])
  const [slotNow, setSlotNow]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const [webPaused, setWebPaused]   = useState(null)
  const [webToggleErr, setWebToggleErr] = useState('')
  const [webToggleBusy, setWebToggleBusy] = useState(false)

  const loadWebPause = useCallback(() => {
    fetchJson(`${API_BASE}/reservation-availability`)
      .then((a) => setWebPaused(Boolean(a.paused)))
      .catch(() => setWebPaused(false))
  }, [])

  useEffect(() => {
    loadWebPause()
  }, [loadWebPause])

  const toggleWebPause = async () => {
    if (!CRM_MUTATE_SECRET) {
      setWebToggleErr(t.dashboard.webBookingsKeyMissing)
      return
    }
    if (webPaused === null) return
    setWebToggleErr('')
    setWebToggleBusy(true)
    try {
      await fetchJson(`${API_BASE}/crm/online-reservations-pause`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CRM-Secret': CRM_MUTATE_SECRET,
        },
        body: JSON.stringify({ paused: !webPaused }),
      })
      await loadWebPause()
    } catch (e) {
      setWebToggleErr(e.message || 'Request failed')
    } finally {
      setWebToggleBusy(false)
    }
  }

  const buildStatsUrl = useCallback(() => {
    if (statView === 'day') {
      return `${API_BASE}/stats?view=day&date=${encodeURIComponent(statDate)}`
    }
    if (statView === 'year') {
      return `${API_BASE}/stats?view=year&year=${encodeURIComponent(String(statYear))}`
    }
    return `${API_BASE}/stats?view=rolling`
  }, [statView, statDate, statYear])

  const load = useCallback(({ silent = false } = {}) => {
    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const hourSlot = `${String(now.getHours()).padStart(2, '0')}:00`

    if (!silent) setLoading(true)

    Promise.all([
      fetchJson(buildStatsUrl()),
      fetchJson(`${API_BASE}/reservations`),
      fetchJson(`${API_BASE}/reservations/slot-load?date=${encodeURIComponent(day)}&time=${encodeURIComponent(hourSlot)}`),
    ])
      .then(([s, res, slot]) => {
        setStats(s)
        setSlotNow(slot)
        const normalized = res.map((r) => {
          const reservationDate = typeof r.reservation_date === 'string'
            ? r.reservation_date.slice(0, 10)
            : ''
          const reservationTime = (r.reservation_time || '').slice(0, 5)
          const reservationDatetime = new Date(`${reservationDate}T${reservationTime || '00:00'}:00`)
          return {
            ...r,
            reservation_date_iso: reservationDate,
            reservation_time_hhmm: reservationTime,
            reservation_datetime: reservationDatetime,
          }
        })

        const tnow = new Date()
        const future = normalized
          .filter((r) => {
            if (r.status === 'cancelled') return false
            if (Number.isNaN(r.reservation_datetime.getTime())) return false
            return r.reservation_datetime >= tnow
          })
          .sort((a, b) => a.reservation_datetime - b.reservation_datetime)
          .slice(0, 8)
        setUpcoming(future)
        if (!silent) setError('')
      })
      .catch((e) => {
        if (!silent) setError(e.message)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [buildStatsUrl])

  useEffect(() => {
    load()
  }, [load])
  useAutoRefresh(load, { intervalMs: 15000 })

  if (loading) return (
    <div className="flex items-center justify-center h-full text-white/20 text-xs tracking-widest uppercase gap-3">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      {t.common.loading}
    </div>
  )

  if (error) return (
    <div className="m-8 px-5 py-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
      {t.common.error}: {error}
    </div>
  )

  const { summary, monthly, byHour, byWeekday } = stats
  const viewMode = stats?.meta?.view || 'rolling'
  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Rolling: last 12 months
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthlyRolling = allMonths.map((m) => {
    const found = monthly.find((r) => r.month === m) || {}
    return {
      month: monthShort(m, lang),
      reservations: found.total_reservations || 0,
      guests: found.total_guests || 0,
    }
  })

  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    return `${statYear}-${m}`
  })
  const monthlyYear = yearMonths.map((m) => {
    const found = monthly.find((r) => r.month === m) || {}
    return {
      month: monthShort(m, lang),
      reservations: found.total_reservations || 0,
      guests: found.total_guests || 0,
    }
  })

  const monthlyFull = viewMode === 'year' ? monthlyYear : monthlyRolling
  const hourData = (byHour || []).map((h) => ({ time: fmtHour(h.hour), count: h.count }))

  const slotKpi = slotKpiFromPayload(slotNow, t)

  const yFrom = new Date().getFullYear() - 5
  const yTo = new Date().getFullYear() + 1
  const yearOptions = []
  for (let y = yTo; y >= yFrom; y -= 1) yearOptions.push(y)

  return (
    <div className="space-y-6 p-4 pb-10 sm:space-y-8 sm:p-6 md:p-8">

      {/* Header */}
      <div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-end min-[480px]:justify-between min-[480px]:gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] tracking-[0.25em] text-[#8fd0ff] uppercase sm:tracking-[0.4em]">{t.dashboard.panel}</p>
          <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">{t.app.dashboard}</h1>
        </div>
        <p className="shrink-0 text-left text-xs tracking-wide text-white/70 min-[480px]:text-right break-words">{today}</p>
      </div>

      {/* Website booking pause (public form) */}
      <div className="border border-white/15 bg-[#0b1522] px-4 py-4 space-y-3">
        <p className="text-[10px] tracking-[0.35em] uppercase text-white/50">{t.dashboard.webBookingsTitle}</p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/80">
            {webPaused === null && '—'}
            {webPaused === false && <span className="text-emerald-300/90">{t.dashboard.webBookingsOn}</span>}
            {webPaused === true && <span className="text-amber-300/90">{t.dashboard.webBookingsPaused}</span>}
          </p>
          <button
            type="button"
            disabled={webToggleBusy || webPaused === null}
            onClick={toggleWebPause}
            className="text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 border border-white/25 text-white/90 hover:border-[#8fd0ff] hover:text-white transition-colors rounded-sm disabled:opacity-40"
          >
            {webToggleBusy ? t.common.loading : webPaused ? t.dashboard.webBookingsResume : t.dashboard.webBookingsStop}
          </button>
        </div>
        {!CRM_MUTATE_SECRET && (
          <p className="text-[11px] text-amber-300/90 max-w-2xl">{t.dashboard.webBookingsKeyHint}</p>
        )}
        {webToggleErr && (
          <p className="text-[11px] text-red-300/90">{webToggleErr}</p>
        )}
      </div>

      {/* CRM stats mode */}
      <div className="border border-white/15 bg-[#0b1522] px-4 py-4 space-y-3">
        <p className="text-[10px] tracking-[0.35em] uppercase text-white/50">{t.dashboard.crmStats}</p>
        <div className="flex flex-wrap items-center gap-2">
          <ModeBtn
            active={statView === 'day' && statDate === todayIso()}
            onClick={() => { setStatView('day'); setStatDate(todayIso()) }}
          >
            {t.dashboard.statsToday}
          </ModeBtn>
          <ModeBtn
            active={statView === 'rolling'}
            onClick={() => setStatView('rolling')}
          >
            {t.dashboard.stats12m}
          </ModeBtn>
          <ModeBtn
            active={statView === 'day' && statDate !== todayIso()}
            onClick={() => setStatView('day')}
          >
            {t.dashboard.statsByDate}
          </ModeBtn>
          <input
            type="date"
            value={statDate}
            onChange={(e) => { setStatDate(e.target.value); setStatView('day') }}
            className="bg-white/[0.08] border border-white/20 text-white text-xs px-3 py-2 outline-none focus:border-[#8fd0ff] rounded-sm [color-scheme:dark]"
            title={t.dashboard.pickDate}
          />
          <ModeBtn
            active={statView === 'year'}
            onClick={() => setStatView('year')}
          >
            {t.dashboard.statsByYear}
          </ModeBtn>
          <select
            value={statYear}
            onChange={(e) => { setStatYear(Number(e.target.value)); setStatView('year') }}
            className="bg-white/[0.08] border border-white/20 text-white text-xs px-3 py-2 outline-none focus:border-[#8fd0ff] rounded-sm cursor-pointer"
            title={t.dashboard.pickYear}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{t.dashboard.yearLabel.replace('{year}', String(y))}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {viewMode === 'day' && (
          <>
            <StatCard label={t.dashboard.oneDayRes} value={summary?.day_reservations} sub={t.dashboard.totalReservations} accent />
            <StatCard label={t.dashboard.oneDayGuests} value={summary?.day_guests} sub={t.dashboard.totalPeople} />
            <StatCard label={t.dashboard.oneDayCancelled} value={summary?.day_cancelled} sub={t.common.cancelled} />
            <StatCard
              label={t.dashboard.currentSlot}
              value={slotKpi.value}
              sub={slotKpi.sub}
            />
          </>
        )}
        {viewMode === 'year' && (
          <>
            <StatCard label={t.dashboard.yearRes} value={summary?.year_reservations} sub={t.dashboard.totalReservations} accent />
            <StatCard label={t.dashboard.yearGuests} value={summary?.year_guests} sub={t.dashboard.totalPeople} />
            <StatCard label={t.dashboard.yearCancelled} value={summary?.year_cancelled} sub={t.common.cancelled} />
            <StatCard
              label={t.dashboard.currentSlot}
              value={slotKpi.value}
              sub={slotKpi.sub}
            />
          </>
        )}
        {viewMode === 'rolling' && (
          <>
            <StatCard label={t.dashboard.today}       value={summary?.today}             sub={t.dashboard.totalReservations} accent />
            <StatCard label={t.dashboard.thisMonth}   value={summary?.this_month}        sub={t.dashboard.totalReservations} />
            <StatCard label={t.dashboard.monthGuests} value={summary?.guests_this_month} sub={t.dashboard.totalPeople} />
            <StatCard
              label={t.dashboard.currentSlot}
              value={slotKpi.value}
              sub={slotKpi.sub}
            />
          </>
        )}
      </div>

      {viewMode === 'day' ? (
        <Section title={t.dashboard.dayHourlyTitle}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" name={t.dashboard.bookings} fill="#4d7ea8" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      ) : (
        <>
          <Section title={viewMode === 'year' ? t.dashboard.monthlyTitleYear : t.dashboard.monthlyTitle}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyFull} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="reservations" name={t.dashboard.reservationsLegend} fill="#4d7ea8" radius={[2,2,0,0]} />
                <Bar dataKey="guests"       name={t.dashboard.guestsLegend}          fill="#8fd0ff" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 mt-3 justify-end">
              {[['#4d7ea8', t.dashboard.reservationsLegend],['#8fd0ff', t.dashboard.guestsLegend]].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                  <span className="text-[10px] text-white/80 tracking-wide">{l}</span>
                </div>
              ))}
            </div>
          </Section>

          <div className="grid lg:grid-cols-2 gap-6">

            <Section title={t.dashboard.slotTitle}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name={t.dashboard.bookings} radius={[2,2,0,0]}>
                    {hourData.map((_, i) => (
                      <Cell key={i}
                        fill={i === hourData.reduce((mi, v, ci, a) => v.count > a[mi].count ? ci : mi, 0)
                          ? '#8fd0ff' : '#4d7ea8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title={t.dashboard.tableUtil}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={(byWeekday || []).map((d) => ({
                    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.max(0, Math.min(6, Number(d.weekday) - 1))],
                    reservations: d.count,
                  }))}
                  layout="vertical"
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="day" tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="reservations" name={t.dashboard.bookings} radius={[0,2,2,0]}>
                    {(byWeekday || []).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#8fd0ff' : '#4d7ea8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(byWeekday || []).map((d) => (
                  <div key={d.weekday} className="text-center border border-white/15 py-2 px-1">
                    <p className="text-white text-xs font-medium">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.max(0, Math.min(6, Number(d.weekday) - 1))]}</p>
                    <p className="text-white/70 text-[9px]">{d.count}×</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}

      {/* Upcoming reservations */}
      <Section title={`${t.dashboard.upcoming} (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-6">{t.dashboard.noUpcoming}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {[t.common.id, t.common.date, t.common.time, t.common.name, t.common.contact, t.common.guests, t.common.notes].map((h) => (
                    <th key={h} className="text-left text-[9px] tracking-[0.35em] uppercase text-white/25 pb-3 pr-6 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r, i) => (
                  <tr key={r.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : ''}`}>
                    <td className="py-3 pr-6 text-white/30 text-xs tabular-nums">#{r.id}</td>
                    <td className="py-3 pr-6 text-white/70 text-xs tabular-nums">
                      {new Date(r.reservation_date_iso + 'T12:00:00').toLocaleDateString(locale, {
                        weekday: 'short', day: '2-digit', month: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-6 text-[#7aafd4] text-xs tabular-nums font-medium">
                      {r.reservation_time_hhmm}
                    </td>
                    <td className="py-3 pr-6 text-white/80 text-xs">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-3 pr-6 text-white/40 text-xs">
                      <p>{r.email}</p>
                      <p>{r.phone}</p>
                    </td>
                    <td className="py-3 pr-6 text-white/50 text-xs">{r.guests}P</td>
                    <td className="py-3 pr-6 text-white/25 text-xs max-w-[180px] truncate">
                      {r.special_needs || t.common.noNotes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

    </div>
  )
}
