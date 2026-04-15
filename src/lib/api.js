const API_TIMEOUT_MS = 15000

export async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const contentType = res.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await res.json() : await res.text()

    if (!res.ok) {
      const message = isJson
        ? payload?.error || `Request failed (${res.status})`
        : `Request failed (${res.status})`
      throw new Error(message)
    }

    if (!isJson) throw new Error('Server returned non-JSON response.')
    return payload
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw err
  } finally {
    clearTimeout(timer)
  }
}
