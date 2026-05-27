const STORAGE_KEY = 'armada-demo-session'

/** Clears any legacy persisted demo session (refresh and disconnect start fresh). */
export function clearDemoSession(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(STORAGE_KEY)
}
