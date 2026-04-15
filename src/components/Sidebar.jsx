import { NavLink } from 'react-router-dom'
import { LANGUAGES, T } from '../lib/i18n'

const NAV = [
  {
    to: '/dashboard',
    key: 'dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/reservations',
    key: 'reservations',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
]

export default function Sidebar({ lang, setLang }) {
  const t = T[lang]

  return (
    <aside className="w-56 bg-[#0d1b2c] border-r border-white/[0.06] flex flex-col shrink-0">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/[0.06]">
        <p className="font-display italic text-[#7aafd4] text-2xl tracking-widest">MERAKI</p>
        <p className="text-white/20 text-[9px] tracking-[0.35em] uppercase mt-1">{t.app.admin}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, key, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs tracking-[0.15em] uppercase transition-all duration-200 ${
                isActive
                  ? 'bg-[#314f6f]/40 text-[#7aafd4] border border-[#314f6f]/40'
                  : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
              }`
            }
          >
            {icon}
            {t.app[key]}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-4 space-y-2">
        <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase px-2">Language</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2 py-2 text-[10px] tracking-[0.12em] uppercase border transition-colors ${
                lang === l.code
                  ? 'bg-[#314f6f]/45 text-[#7aafd4] border-[#314f6f]/50'
                  : 'bg-white/[0.03] text-white/45 border-white/10 hover:text-white/70 hover:border-white/20'
              }`}
            >
              {l.code}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/[0.05]">
        <p className="text-white/15 text-[9px] tracking-[0.3em] uppercase">Klotenerstrasse 14</p>
        <p className="text-white/10 text-[9px] tracking-[0.3em] uppercase">8303 Bassersdorf</p>
      </div>
    </aside>
  )
}
