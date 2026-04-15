import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { T, localeFor, monthShort } from '../lib/i18n'
import { fetchJson } from '../lib/api'

const API = import.meta.env.VITE_API_BASE || 'https://merakibackend.vercel.app/api'

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
      accent ? 'border-[#314f6f]/60 bg-[#314f6f]/10' : 'border-white/[0.07] bg-[#0d1b2c]'
    }`}>
      <p className="text-[9px] tracking-[0.4em] uppercase text-white/30">{label}</p>
      <p className={`text-3xl md:text-4xl font-semibold leading-none mt-1 ${accent ? 'text-[#7aafd4]' : 'text-white'}`}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="border border-white/[0.07] bg-[#0d1b2c]">
      <div className="px-6 py-4 border-b border-white/[0.06]">
        <h2 className="text-[10px] tracking-[0.4em] uppercase text-white/40">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { lang } = useOutletContext()
  const t = T[lang]
  const locale = localeFor(lang)

  const [stats, setStats]         = useState(null)
  const [upcoming, setUpcoming]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    Promise.all([
      fetchJson(`${API}/stats`),
      fetchJson(`${API}/reservations`),
    ])
      .then(([s, res]) => {
        setStats(s)
        // upcoming: future reservations sorted by date+time
        const now = new Date()
        const future = res
          .filter((r) => {
            if (r.status === 'cancelled') return false
            const dt = new Date(`${r.reservation_date}T${r.reservation_time}`)
            return dt >= now
          })
          .sort((a, b) =>
            new Date(`${a.reservation_date}T${a.reservation_time}`) -
            new Date(`${b.reservation_date}T${b.reservation_time}`)
          )
          .slice(0, 8)
        setUpcoming(future)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [t.dashboard.serverReservationsErr, t.dashboard.serverStatsErr])

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

  const { summary, monthly, byHour, byTable } = stats
  const totalGuestsUpcoming = upcoming.reduce((sum, r) => sum + (Number(r.guests) || 0), 0)

  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Fill missing months for the last 12
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 11 + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const monthlyFull = allMonths.map((m) => {
    const found = monthly.find((r) => r.month === m) || {}
    return {
      month: monthShort(m, lang),
      reservations: found.total_reservations || 0,
      guests: found.total_guests || 0,
    }
  })

  const hourData = byHour.map((h) => ({ time: fmtHour(h.hour), count: h.count }))

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[#7aafd4] text-[10px] tracking-[0.5em] uppercase mb-1">{t.dashboard.panel}</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-white leading-none">{t.app.dashboard}</h1>
        </div>
        <p className="text-white/20 text-xs tracking-wide">{today}</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t.dashboard.today}       value={summary.today}             sub={t.dashboard.totalReservations} accent />
        <StatCard label={t.dashboard.thisMonth}   value={summary.this_month}        sub={t.dashboard.totalReservations} />
        <StatCard label={t.dashboard.monthGuests} value={summary.guests_this_month} sub={t.dashboard.totalPeople} />
        <StatCard label={t.dashboard.nextBookings} value={upcoming.length}          sub={`${totalGuestsUpcoming} ${t.dashboard.plannedGuests}`} />
      </div>

      {/* Monthly chart */}
      <Section title={t.dashboard.monthlyTitle}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyFull} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="reservations" name={t.dashboard.reservationsLegend} fill="#314f6f" radius={[2,2,0,0]} />
            <Bar dataKey="guests"       name={t.dashboard.guestsLegend}          fill="#7aafd4" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-3 justify-end">
          {[['#314f6f', t.dashboard.reservationsLegend],['#7aafd4', t.dashboard.guestsLegend]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-[10px] text-white/30 tracking-wide">{l}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Two columns: time slots + table utilization */}
      <div className="grid lg:grid-cols-2 gap-6">

        <Section title={t.dashboard.slotTitle}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" name={t.dashboard.bookings} radius={[2,2,0,0]}>
                {hourData.map((_, i) => (
                  <Cell key={i}
                    fill={i === hourData.reduce((mi, v, ci, a) => v.count > a[mi].count ? ci : mi, 0)
                      ? '#7aafd4' : '#314f6f'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title={t.dashboard.tableUtil}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byTable} layout="vertical" barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<CTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="reservations" name={t.dashboard.bookings} radius={[0,2,2,0]}>
                {byTable.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#7aafd4' : '#314f6f'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {byTable.map((t) => (
              <div key={t.label} className="text-center border border-white/[0.06] py-2 px-1">
                <p className="text-white/60 text-xs font-medium">{t.label}</p>
                <p className="text-white/20 text-[9px]">{t.capacity}P · {t.reservations}×</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Upcoming reservations */}
      <Section title={`${t.dashboard.upcoming} (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-6">{t.dashboard.noUpcoming}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {[t.common.id, t.common.date, t.common.time, t.common.name, t.common.contact, t.common.guests, t.common.table, t.common.notes].map((h) => (
                    <th key={h} className="text-left text-[9px] tracking-[0.35em] uppercase text-white/25 pb-3 pr-6 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r, i) => (
                  <tr key={r.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : ''}`}>
                    <td className="py-3 pr-6 text-white/30 text-xs tabular-nums">#{r.id}</td>
                    <td className="py-3 pr-6 text-white/70 text-xs tabular-nums">
                      {new Date(r.reservation_date + 'T12:00:00').toLocaleDateString(locale, {
                        weekday: 'short', day: '2-digit', month: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-6 text-[#7aafd4] text-xs tabular-nums font-medium">
                      {r.reservation_time?.slice(0, 5)}
                    </td>
                    <td className="py-3 pr-6 text-white/80 text-xs">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-3 pr-6 text-white/40 text-xs">
                      <p>{r.email}</p>
                      <p>{r.phone}</p>
                    </td>
                    <td className="py-3 pr-6 text-white/50 text-xs">{r.guests}P</td>
                    <td className="py-3 pr-6">
                      <span className="text-[10px] px-2 py-0.5 bg-[#314f6f]/30 text-[#7aafd4] border border-[#314f6f]/40">
                        {r.table_label}
                      </span>
                    </td>
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
