import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { DEFAULT_LANG, T } from '../lib/i18n'

export default function Layout() {
  const [lang, setLang] = useState(() => localStorage.getItem('crm_lang') || DEFAULT_LANG)

  useEffect(() => {
    localStorage.setItem('crm_lang', lang)
    document.documentElement.lang = lang
    document.title = `Meraki CRM · ${T[lang].app.dashboard}`
  }, [lang])

  return (
    <div className="flex h-screen bg-[#070e17] text-white overflow-hidden font-sans">
      <Sidebar lang={lang} setLang={setLang} />
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ lang, setLang }} />
      </main>
    </div>
  )
}
