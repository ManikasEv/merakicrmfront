import { SignIn } from '@clerk/clerk-react'
import { tForLang, resolveLang } from '../lib/i18n'

const VITE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function SignInPage() {
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

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-[#0b1522] px-4 py-10">
      <p className="mb-6 font-display italic text-2xl tracking-widest text-[#8fd0ff]">MERAKI</p>
      <p className="mb-8 text-[10px] tracking-[0.35em] uppercase text-white/50">{t.auth.signInHeading}</p>
      <div className="w-full max-w-md flex justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          signInUrl="/sign-in"
          withSignUp={false}
          afterSignInUrl="/dashboard"
          signInFallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}
