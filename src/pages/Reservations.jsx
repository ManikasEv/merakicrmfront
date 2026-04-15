import { useEffect, useState, useMemo } from 'react'

const API = import.meta.env.VITE_API_BASE

const STATUS_LABEL = { confirmed: 'Bestätigt', cancelled: 'Storniert' }
const STATUS_CLS   = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled:  'bg-red-500/10    text-red-400    border-red-500/20',
}

function Badge({ status }) {
  return (
    <span className={`inline-flex text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border ${STATUS_CLS[status] ?? 'bg-white/5 text-white/30 border-white/10'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function Th({ children, sorted, dir, onClick }) {
  return (
    <th
      onClick={onClick}
      className="text-left text-[9px] tracking-[0.35em] uppercase text-white/25 pb-3 pr-5 font-normal whitespace-nowrap select-none cursor-pointer hover:text-white/50 transition-colors"
    >
      {children}
      {sorted && <span className="ml-1 text-[#7aafd4]">{dir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

export default function Reservations() {
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [sort, setSort]         = useState({ key: 'reservation_date', dir: 'desc' })

  const [confirmCancel, setConfirmCancel] = useState(null) // reservation id

  const load = () => {
    setLoading(true)
    fetch(`${API}/reservations`)
      .then((r) => r.json())
      .then(setAll)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const cancel = async (id) => {
    await fetch(`${API}/reservations/${id}`, { method: 'DELETE' })
    setConfirmCancel(null)
    load()
  }

  const toggleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return all
      .filter((r) => {
        if (statusF !== 'all' && r.status !== statusF) return false
        if (dateFrom && r.reservation_date < dateFrom) return false
        if (dateTo   && r.reservation_date > dateTo)   return false
        if (q && ![r.first_name, r.last_name, r.email, r.phone]
          .some((f) => f?.toLowerCase().includes(q))) return false
        return true
      })
      .sort((a, b) => {
        let av = a[sort.key] ?? ''
        let bv = b[sort.key] ?? ''
        if (sort.key === 'reservation_date') {
          av = a.reservation_date + a.reservation_time
          bv = b.reservation_date + b.reservation_time
        }
        return sort.dir === 'asc' ? av > bv ? 1 : -1 : av < bv ? 1 : -1
      })
  }, [all, search, statusF, dateFrom, dateTo, sort])

  const active    = filtered.filter((r) => r.status !== 'cancelled').length
  const cancelled = filtered.filter((r) => r.status === 'cancelled').length

  const inputCls =
    'bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs px-3 py-2 outline-none ' +
    'focus:border-[#7aafd4]/50 transition-colors placeholder:text-white/20 rounded-sm'

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[#7aafd4] text-[10px] tracking-[0.5em] uppercase mb-1">Verwaltung</p>
          <h1 className="font-display italic text-4xl text-white leading-none">Reservierungen</h1>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className="text-2xl font-display italic text-emerald-400">{active}</p>
            <p className="text-[9px] text-white/25 tracking-widest uppercase">Aktiv</p>
          </div>
          <div>
            <p className="text-2xl font-display italic text-red-400">{cancelled}</p>
            <p className="text-[9px] text-white/25 tracking-widest uppercase">Storniert</p>
          </div>
          <div>
            <p className="text-2xl font-display italic text-white/60">{filtered.length}</p>
            <p className="text-[9px] text-white/25 tracking-widest uppercase">Gesamt</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-white/[0.07] bg-[#0d1b2c] p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          placeholder="Name, E-Mail oder Telefon…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className={inputCls + ' col-span-2 md:col-span-1'}
        />
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}
          className={inputCls + ' bg-[#0d1b2c] cursor-pointer'}>
          <option value="all">Alle Status</option>
          <option value="confirmed">Bestätigt</option>
          <option value="cancelled">Storniert</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className={inputCls + ' [color-scheme:dark]'} placeholder="Von" />
        <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}
          className={inputCls + ' [color-scheme:dark]'} placeholder="Bis" />
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="border border-white/[0.07] bg-[#0d1b2c]">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/20 text-xs tracking-widest uppercase gap-3">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Laden…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-white/20 text-xs tracking-widest uppercase">Keine Einträge gefunden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.07]">
                <tr className="px-6">
                  <td className="w-5" />
                  <Th sorted={sort.key === 'reservation_date'} dir={sort.dir} onClick={() => toggleSort('reservation_date')}>Datum & Zeit</Th>
                  <Th sorted={sort.key === 'first_name'}       dir={sort.dir} onClick={() => toggleSort('first_name')}>Name</Th>
                  <Th>Kontakt</Th>
                  <Th sorted={sort.key === 'guests'}           dir={sort.dir} onClick={() => toggleSort('guests')}>Gäste</Th>
                  <Th>Tisch</Th>
                  <Th>Hinweise</Th>
                  <Th sorted={sort.key === 'status'}           dir={sort.dir} onClick={() => toggleSort('status')}>Status</Th>
                  <Th>Aktion</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group ${
                      r.status === 'cancelled' ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="pl-6 py-3.5 text-white/15 text-[10px] tabular-nums">{i + 1}</td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white/80 text-xs tabular-nums">
                        {new Date(r.reservation_date + 'T12:00:00').toLocaleDateString('de-CH', {
                          weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </p>
                      <p className="text-[#7aafd4] text-[11px] tabular-nums font-medium">
                        {r.reservation_time?.slice(0, 5)} Uhr
                      </p>
                    </td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white/80 text-xs">{r.first_name} {r.last_name}</p>
                    </td>
                    <td className="py-3.5 pr-5">
                      <p className="text-white/40 text-[11px]">{r.email}</p>
                      <p className="text-white/25 text-[10px]">{r.phone}</p>
                    </td>
                    <td className="py-3.5 pr-5 text-white/60 text-xs text-center">
                      {r.guests}
                    </td>
                    <td className="py-3.5 pr-5">
                      <span className="text-[10px] px-2 py-0.5 bg-[#314f6f]/30 text-[#7aafd4] border border-[#314f6f]/40">
                        {r.table_label}
                        <span className="text-[#7aafd4]/40 ml-1">{r.capacity}P</span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-5 max-w-[160px]">
                      <p className="text-white/25 text-[11px] truncate">{r.special_needs || '—'}</p>
                    </td>
                    <td className="py-3.5 pr-5">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-3.5 pr-6">
                      {r.status !== 'cancelled' && (
                        <button
                          onClick={() => setConfirmCancel(r.id)}
                          className="text-[9px] tracking-[0.2em] uppercase text-red-400/50 hover:text-red-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          Stornieren
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

      {/* Cancel confirm modal */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0d1b2c] border border-white/[0.1] p-8 max-w-sm w-full mx-4 space-y-5">
            <div>
              <h3 className="font-display italic text-2xl text-white">Reservierung stornieren?</h3>
              <p className="text-white/40 text-sm mt-2">
                Diese Aktion kann nicht rückgängig gemacht werden. Der Tisch wird freigegeben.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => cancel(confirmCancel)}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/30 text-red-400 text-xs tracking-[0.2em] uppercase hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, stornieren
              </button>
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 py-3 border border-white/10 text-white/40 text-xs tracking-[0.2em] uppercase hover:text-white/70 hover:border-white/20 transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
