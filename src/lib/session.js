// Remember the logged-in employee on this device (spec: auto-login after first login).
const KEY = 'tropical-fish-session'

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
