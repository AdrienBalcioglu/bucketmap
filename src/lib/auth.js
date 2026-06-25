const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30

let attempts = 0
let lockoutUntil = null

export function getStoredPin() {
  return localStorage.getItem('cutemap-pin') || ''
}

export function setStoredPin(pin) {
  if (pin) localStorage.setItem('cutemap-pin', pin)
  else localStorage.removeItem('cutemap-pin')
}

export function hasPin() {
  return !!getStoredPin()
}

export function verifyPin(code) {
  const now = Date.now()
  if (lockoutUntil && now < lockoutUntil) return 'locked'
  if (code === getStoredPin()) {
    attempts = 0
    lockoutUntil = null
    return 'ok'
  }
  attempts += 1
  if (attempts >= MAX_ATTEMPTS) {
    lockoutUntil = now + LOCKOUT_SECONDS * 1000
    return 'locked'
  }
  return 'invalid'
}

export function getLockoutRemaining() {
  if (!lockoutUntil) return 0
  const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}
