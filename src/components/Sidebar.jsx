import { NavLink } from 'react-router-dom'
import { LANGUAGES, tForLang } from '../lib/i18n'

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
  {
    to: '/clients',
    key: 'clients',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m8-12a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: '/menu',
    key: 'menu',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
]

export default function Sidebar({ lang, setLang, mobileOpen, onCloseMobile }) {
  const t = tForLang(lang)
  const close = () => onCloseMobile?.()

  return (
    <aside
      className={[
        'z-50 flex w-[min(20rem,88vw)] max-w-[100vw] flex-col border-r border-white/15 bg-[#101c2d]',
        'fixed inset-y-0 left-0 transition-transform duration-200 ease-out',
        'md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shrink-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >

      {/* Brand */}
      <div className="px-6 py-6 border-b border-white/15">
        <p className="font-display italic text-[#8fd0ff] text-2xl tracking-widest">MERAKI</p>
        <p className="text-white/70 text-[10px] tracking-[0.2em] uppercase mt-1 break-words">{t.app.admin}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, key, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={close}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-sm px-3 py-2.5 text-[12px] tracking-wide transition-all duration-200 sm:text-[11px] sm:tracking-[0.08em] ${
                isActive
                  ? 'border border-[#8fd0ff]/30 bg-[#4d7ea8]/45 text-white'
                  : 'border border-transparent text-white/80 hover:bg-white/[0.08] hover:text-white'
              }`
            }
            title={t.app[key]}
          >
            {icon}
            <span className="min-w-0 flex-1 break-words">{t.app[key]}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-4 space-y-2">
        <p className="text-white/70 text-[9px] tracking-[0.2em] uppercase px-2">{t.common.language}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2 py-2 text-[10px] tracking-[0.12em] uppercase border transition-colors ${
                lang === l.code
                  ? 'bg-[#4d7ea8]/50 text-white border-[#8fd0ff]/40'
                  : 'bg-white/[0.06] text-white/80 border-white/20 hover:text-white hover:border-white/40'
              }`}
            >
              {l.code}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-white/60 text-[9px] tracking-[0.3em] uppercase">Klotenerstrasse 14</p>
        <p className="text-white/50 text-[9px] tracking-[0.3em] uppercase">8303 Bassersdorf</p>
      </div>
    </aside>
  )
}
