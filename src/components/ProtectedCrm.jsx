import { useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import { tForLang, resolveLang } from '../lib/i18n'

const VITE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function ProtectedCrm({ children }) {
  const { isLoaded, isSignedIn } = useAuth()
  const location = useLocation()
  const t = tForLang(resolveLang(localStorage.getItem('crm_lang')))

  if (!VITE_KEY) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#0b1522] text-amber-200/90 flex items-center justify-center p-6 text-sm text-center max-w-md">
        <p>
          Set <code className="text-white/80">VITE_CLERK_PUBLISHABLE_KEY</code> in <code className="text-white/80">crm/.env</code> and restart the dev server.
        </p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#0b1522] text-white/80 flex items-center justify-center text-sm">
        {t.common.loading}
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  return children
}
