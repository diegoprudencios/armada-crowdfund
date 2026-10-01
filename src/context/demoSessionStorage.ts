import type { HopVariant } from '../components/HopPill/HopPill'
import type { SlotData } from '../components/InviteFlow/screens/SlotCard'
import type { InviteAllowance } from '../components/MyPosition/inviteModel'
import type { DemoWallet } from './DemoSessionContext'
import type { DemoSalePhase } from '../lib/demoSaleLifecycle'
import type { DemoSelfFillState } from '../lib/demoSelfFill'

const STORAGE_KEY = 'armada-demo-session'
const STORAGE_VERSION = 5

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
  hopState?: DemoSelfFillState
  slots: StoredSlot[]
  inviteAllowance: InviteAllowance
  salePhase: DemoSalePhase
  windowOpen: boolean
  saleBelowMin: boolean
  armClaimed: boolean
  refundClaimed: boolean
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
    hideFromList: slot.hideFromList ?? false,
  }))
}

function isHopVariant(value: unknown): value is HopVariant {
  return value === 'seed' || value === 'hop-1' || value === 'hop-2' || value === 'multi-hop'
}

function isSalePhase(value: unknown): value is DemoSalePhase {
  return value === 0 || value === 1 || value === 2
}

export type DemoSessionFields = {
  wallet: DemoWallet | null
  committedUsdc: number
  hasParticipated: boolean
  hopVariant: HopVariant
  hopState?: DemoSelfFillState
  slots: SlotData[]
  inviteAllowance: InviteAllowance
  salePhase: DemoSalePhase
  windowOpen: boolean
  saleBelowMin: boolean
  armClaimed: boolean
  refundClaimed: boolean
}

export function readDemoSession(): DemoSessionFields | null {
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
      hopVariant: isHopVariant(parsed.hopVariant) ? parsed.hopVariant : 'seed',
      hopState: parsed.hopState,
      slots: reviveSlots(parsed.slots ?? []),
      inviteAllowance: parsed.inviteAllowance ?? { hop1: 3, hop2: 0 },
      salePhase: isSalePhase(parsed.salePhase) ? parsed.salePhase : 0,
      windowOpen: parsed.windowOpen ?? true,
      saleBelowMin: parsed.saleBelowMin ?? false,
      armClaimed: parsed.armClaimed ?? false,
      refundClaimed: parsed.refundClaimed ?? false,
    }
  } catch {
    return null
  }
}

export function writeDemoSession(session: DemoSessionFields): void {
  if (typeof window === 'undefined') return

  const payload: StoredDemoSession = {
    version: STORAGE_VERSION,
    wallet: session.wallet,
    committedUsdc: session.committedUsdc,
    hasParticipated: session.hasParticipated,
    hopVariant: session.hopVariant,
    hopState: session.hopState,
    slots: serializeSlots(session.slots),
    inviteAllowance: session.inviteAllowance,
    salePhase: session.salePhase,
    windowOpen: session.windowOpen,
    saleBelowMin: session.saleBelowMin,
    armClaimed: session.armClaimed,
    refundClaimed: session.refundClaimed,
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
