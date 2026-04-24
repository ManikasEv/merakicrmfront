import { useAuth } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import { API_BASE } from '../lib/apiBase'

/**
 * On sign-in, upserts the Clerk user (email, names) to Neon via the API.
 * Safe to re-run; the server is idempotent.
 */
export default function CrmUserSync() {
  const { getToken, isSignedIn } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (!isSignedIn) {
      done.current = false
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn || done.current) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const r = await fetch(`${API_BASE}/crm/user/sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
        if (!cancelled && r.ok) done.current = true
      } catch {
        /* try again on next mount / sign-in */
      }
    })()
    return () => { cancelled = true }
  }, [isSignedIn, getToken])

  return null
}
