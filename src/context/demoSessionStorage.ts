import type { HopVariant } from '../components/HopPill/HopPill'
import type { SlotData } from '../components/InviteFlow/screens/SlotCard'
import type { InviteAllowance } from '../components/MyPosition/inviteModel'
import type { DemoWallet } from './DemoSessionContext'

const STORAGE_KEY = 'armada-demo-session'
const STORAGE_VERSION = 3

type StoredSlot = Omit<SlotData, 'expiresAt' | 'joinedAt' | 'invitedAt' | 'closedAt'> & {
  expiresAt?: string
  joinedAt?: string
  invitedAt?: string
  closedAt?: string
}

export type StoredDemoSession = {
  version: typeof STORAGE_VERSION
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  hopVariant: HopVariant
  slots: StoredSlot[]
  inviteAllowance: InviteAllowance
}

function serializeSlots(slots: SlotData[]): StoredSlot[] {
  return slots.map((slot) => ({
    ...slot,
    expiresAt: slot.expiresAt?.toISOString(),
    joinedAt: slot.joinedAt?.toISOString(),
    invitedAt: slot.invitedAt?.toISOString(),
    closedAt: slot.closedAt?.toISOString(),
  }))
}

function reviveSlots(slots: StoredSlot[]): SlotData[] {
  return slots.map((slot) => ({
    ...slot,
    expiresAt: slot.expiresAt ? new Date(slot.expiresAt) : undefined,
    joinedAt: slot.joinedAt ? new Date(slot.joinedAt) : undefined,
    invitedAt: slot.invitedAt ? new Date(slot.invitedAt) : undefined,
    closedAt: slot.closedAt ? new Date(slot.closedAt) : undefined,
    // Deferred-list invites become visible if the confirmation was abandoned mid-session.
    hideFromList: false,
  }))
}

function isHopVariant(value: unknown): value is HopVariant {
  return value === 'seed' || value === 'hop-1' || value === 'hop-2' || value === 'multi-hop'
}

export function readDemoSession(): {
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  hopVariant: HopVariant
  slots: SlotData[]
  inviteAllowance: InviteAllowance
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
      hopVariant: isHopVariant(parsed.hopVariant) ? parsed.hopVariant : 'hop-1',
      slots: reviveSlots(parsed.slots ?? []),
      inviteAllowance: parsed.inviteAllowance ?? { hop1: 3, hop2: 0 },
    }
  } catch {
    return null
  }
}

export function writeDemoSession(session: {
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  hopVariant: HopVariant
  slots: SlotData[]
  inviteAllowance: InviteAllowance
}): void {
  if (typeof window === 'undefined') return

  const payload: StoredDemoSession = {
    version: STORAGE_VERSION,
    wallet: session.wallet,
    committedUsdc: session.committedUsdc,
    hasParticipated: session.hasParticipated,
    hopVariant: session.hopVariant,
    slots: serializeSlots(session.slots),
    inviteAllowance: session.inviteAllowance,
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
