import type { SlotData } from '../components/InviteFlow/screens/SlotCard'
import type { DemoWallet } from './DemoSessionContext'

const STORAGE_KEY = 'armada-demo-session'
const STORAGE_VERSION = 1

type StoredSlot = Omit<SlotData, 'expiresAt'> & {
  expiresAt?: string
}

export type StoredDemoSession = {
  version: typeof STORAGE_VERSION
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  slots: StoredSlot[]
}

function serializeSlots(slots: SlotData[]): StoredSlot[] {
  return slots.map((slot) => ({
    ...slot,
    expiresAt: slot.expiresAt?.toISOString(),
  }))
}

function reviveSlots(slots: StoredSlot[]): SlotData[] {
  return slots.map((slot) => ({
    ...slot,
    expiresAt: slot.expiresAt ? new Date(slot.expiresAt) : undefined,
  }))
}

export function readDemoSession(): {
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  slots: SlotData[]
} | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredDemoSession
    if (parsed.version !== STORAGE_VERSION) return null

    return {
      wallet: parsed.wallet,
      committedUsdc: parsed.committedUsdc ?? 0,
      hasParticipated: parsed.hasParticipated ?? false,
      slots: reviveSlots(parsed.slots ?? []),
    }
  } catch {
    return null
  }
}

export function writeDemoSession(session: {
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  slots: SlotData[]
}): void {
  if (typeof window === 'undefined') return

  const payload: StoredDemoSession = {
    version: STORAGE_VERSION,
    wallet: session.wallet,
    committedUsdc: session.committedUsdc,
    hasParticipated: session.hasParticipated,
    slots: serializeSlots(session.slots),
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearDemoSession(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(STORAGE_KEY)
}

/** True when the user refreshed the page (not link navigation from another entry). */
export function isPageReload(): boolean {
  if (typeof window === 'undefined') return false

  const entry = performance.getEntriesByType('navigation')[0]
  if (entry && 'type' in entry) {
    return (entry as PerformanceNavigationTiming).type === 'reload'
  }

  return false
}
