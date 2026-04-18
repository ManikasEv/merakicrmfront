import { useEffect } from 'react'

export function useAutoRefresh(onRefresh, {
  enabled = true,
  intervalMs = 15000,
} = {}) {
  useEffect(() => {
    if (!enabled) return undefined

    let stopped = false

    const triggerRefresh = () => {
      if (stopped || document.hidden) return
      onRefresh({ silent: true })
    }

    const onWindowFocus = () => triggerRefresh()
    const onVisibilityChange = () => {
      if (!document.hidden) triggerRefresh()
    }

    const timer = setInterval(triggerRefresh, intervalMs)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopped = true
      clearInterval(timer)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [enabled, intervalMs, onRefresh])
}
