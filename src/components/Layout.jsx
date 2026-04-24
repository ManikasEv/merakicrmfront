import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { tForLang, resolveLang } from '../lib/i18n'

export default function Layout() {
  const [lang, setLang] = useState(() => resolveLang(localStorage.getItem('crm_lang')))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('crm_lang', lang)
    document.documentElement.lang = lang
    document.title = `Meraki CRM · ${tForLang(lang).app.dashboard}`
  }, [lang])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-[#0b1522] text-white font-sans">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/55 md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        lang={lang}
        setLang={setLang}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0b1522]/95 px-3 py-2.5 backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-white/20 text-white/90 hover:bg-white/10"
            aria-expanded={mobileNavOpen}
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="font-display text-lg italic leading-none text-[#8fd0ff]">MERAKI</p>
            <p className="truncate text-[9px] uppercase tracking-widest text-white/50">CRM</p>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet context={{ lang, setLang }} />
        </main>
      </div>
    </div>
  )
}
