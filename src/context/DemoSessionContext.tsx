// ABOUTME: Cross-page demo wallet / commit / invite session (sessionStorage; reset on refresh).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { HopVariant } from '../components/HopPill/HopPill'
import type { SlotData } from '../components/InviteFlow/screens/SlotCard'
import {
  nextInviteId,
  type InviteAllowance,
  type InviteeHop,
} from '../components/MyPosition/inviteModel'
import { isProviderWhitelisted } from '../components/ParticipateFlow/participateFlowWallets'
import { CAP, DEMO_WALLET, DEMO_WALLET_DISPLAY } from '../components/MyPosition/myPositionDemo'
import {
  clearDemoSession,
  isPageReload,
  readDemoSession,
  writeDemoSession,
} from './demoSessionStorage'

/** Hop-0 starts with 3→Hop-1; Hop-2 rights unlock with Hop-1 positions. */
const INITIAL_ALLOWANCE: InviteAllowance = { hop1: 3, hop2: 0 }

const HOP_LABEL: Record<HopVariant, string> = {
  seed: 'HOP-0',
  'hop-1': 'HOP-1',
  'hop-2': 'HOP-2',
  'multi-hop': 'MULTI-HOP',
}

function createFreshSession() {
  return {
    wallet: null as DemoWallet | null,
    committedUsdc: 0,
    hasParticipated: false,
    hopVariant: 'hop-1' as HopVariant,
    slots: [] as SlotData[],
    inviteAllowance: { ...INITIAL_ALLOWANCE },
  }
}

export type DemoWallet = {
  provider: string
  address: string
  displayAddress: string
}

type DemoSessionContextValue = {
  wallet: DemoWallet | null
  walletConnected: boolean
  committedUsdc: number
  hasParticipated: boolean
  hopVariant: HopVariant
  hopLabel: string
  capUsdc: number
  fillPct: number
  slots: SlotData[]
  inviteAllowance: InviteAllowance
  connectWallet: (provider: string) => void
  disconnectWallet: () => void
  completeParticipation: (amountUsdc: number) => void
  consumeSelfInvites: (inviteCount: number) => void
  generateInviteLink: (hop: InviteeHop) => Promise<{
    id: number
    link: string
    expiresAt: Date
  }>
  /** @deprecated Prefer generateInviteLink(hop) — maps slot id → hop for legacy SlotCard flows. */
  generateSlotLink: (slotId: number) => Promise<void>
  revokeSlot: (slotId: number) => Promise<void>
  /** Reveal a newly created invite in the sent list (after confirmation Done/close). */
  revealInviteInList: (id: number) => void
  /** Drop a deferred invite that was revoked from the confirmation screen. */
  discardDeferredInvite: (id: number) => void
  /** Commit every deferred invite (e.g. leaving My Position mid-confirmation). */
  flushPendingInvites: () => void
  inviteOnchain: (
    hop: InviteeHop,
    address: string,
    ensName?: string,
  ) => Promise<{ id: number; address: string; ensName?: string }>
  /** @deprecated Prefer inviteOnchain(hop, …). */
  inviteSlotOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  loadingHop: InviteeHop | null
  loadingSlotId: number | null
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null)

function loadInitialSession() {
  if (isPageReload()) {
    clearDemoSession()
    return createFreshSession()
  }

  const stored = readDemoSession()
  if (!stored) {
    return createFreshSession()
  }

  return {
    wallet: stored.wallet,
    committedUsdc: stored.committedUsdc,
    hasParticipated: stored.hasParticipated,
    hopVariant: stored.hopVariant,
    slots: stored.slots,
    inviteAllowance: stored.inviteAllowance ?? { ...INITIAL_ALLOWANCE },
  }
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitialSession)
  const [wallet, setWallet] = useState<DemoWallet | null>(initial.wallet)
  const [committedUsdc, setCommittedUsdc] = useState(initial.committedUsdc)
  const [hasParticipated, setHasParticipated] = useState(initial.hasParticipated)
  const [hopVariant, setHopVariant] = useState<HopVariant>(initial.hopVariant)
  const [slots, setSlots] = useState<SlotData[]>(initial.slots)
  const [inviteAllowance, setInviteAllowance] = useState<InviteAllowance>(
    initial.inviteAllowance,
  )
  const [loadingHop, setLoadingHop] = useState<InviteeHop | null>(null)
  /** Drafts created during confirmation — not in `slots` until Done. */
  const pendingInvitesRef = useRef<Map<number, SlotData>>(new Map())
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  const allocateInviteId = useCallback(() => {
    return nextInviteId([
      ...slotsRef.current,
      ...pendingInvitesRef.current.values(),
    ])
  }, [])

  useEffect(() => {
    writeDemoSession({
      wallet,
      committedUsdc,
      hasParticipated,
      hopVariant,
      slots,
      inviteAllowance,
    })
  }, [wallet, committedUsdc, hasParticipated, hopVariant, slots, inviteAllowance])

  const hopLabel = HOP_LABEL[hopVariant]

  const connectWallet = useCallback((provider: string) => {
    if (!isProviderWhitelisted(provider)) return
    setWallet({
      provider,
      address: DEMO_WALLET,
      displayAddress: DEMO_WALLET_DISPLAY,
    })
  }, [])

  const disconnectWallet = useCallback(() => {
    clearDemoSession()
    const fresh = createFreshSession()
    setWallet(fresh.wallet)
    setCommittedUsdc(fresh.committedUsdc)
    setHasParticipated(fresh.hasParticipated)
    setHopVariant(fresh.hopVariant)
    setSlots(fresh.slots)
    setInviteAllowance(fresh.inviteAllowance)
    setLoadingHop(null)
    pendingInvitesRef.current.clear()
  }, [])

  const completeParticipation = useCallback((amountUsdc: number) => {
    setCommittedUsdc((prev) => Math.min(CAP, prev + amountUsdc))
    setHasParticipated(true)
  }, [])

  /**
   * Self-fill max-out: spend Hop-1 invite slots on yourself and unlock Hop-2 rights
   * (2 per Hop-1 position — CROWDFUND.md).
   */
  const consumeSelfInvites = useCallback((inviteCount: number) => {
    if (inviteCount <= 0) return
    setHopVariant('multi-hop')
    setSlots((prev) => {
      let remaining = inviteCount
      const next = [...prev]
      let id = nextInviteId(prev)
      const now = new Date()
      while (remaining > 0) {
        next.push({
          id: id++,
          status: 'redeemed',
          redeemedBy: DEMO_WALLET,
          joinedAt: now,
          invitedAt: now,
          inviteeHop: 1,
        })
        remaining -= 1
      }
      return next
    })
    setInviteAllowance((prev) => ({
      ...prev,
      hop2: Math.min(20, prev.hop2 + inviteCount * 2),
    }))
  }, [])

  const generateInviteLink = useCallback(async (hop: InviteeHop) => {
    setLoadingHop(hop)
    await new Promise((r) => setTimeout(r, 1200))
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const link = `https://armada.wtf/join?invite=${Math.random().toString(36).slice(2, 10)}&hop=hop-${hop}`
    const createdId = allocateInviteId()
    pendingInvitesRef.current.set(createdId, {
      id: createdId,
      status: 'link-active',
      link,
      expiresAt,
      inviteeHop: hop,
      invitedAt: new Date(),
    })
    setLoadingHop(null)
    return { id: createdId, link, expiresAt }
  }, [allocateInviteId])

  const generateSlotLink = useCallback(
    async (slotId: number) => {
      const hop: InviteeHop = slotId === 2 ? 2 : 1
      const created = await generateInviteLink(hop)
      // Legacy slot UI has no confirmation — commit immediately.
      const draft = pendingInvitesRef.current.get(created.id)
      pendingInvitesRef.current.delete(created.id)
      if (draft) {
        setSlots((prev) => [draft, ...prev])
      }
    },
    [generateInviteLink],
  )

  const revokeSlot = useCallback(async (slotId: number) => {
    await new Promise((r) => setTimeout(r, 900))
    pendingInvitesRef.current.delete(slotId)
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              status: 'revoked' as const,
              closedAt: new Date(),
              hideFromList: false,
            }
          : slot,
      ),
    )
  }, [])

  const revealInviteInList = useCallback((id: number) => {
    const draft = pendingInvitesRef.current.get(id)
    pendingInvitesRef.current.delete(id)
    if (!draft) {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === id ? { ...slot, hideFromList: false } : slot,
        ),
      )
      return
    }
    setSlots((prev) => {
      if (prev.some((slot) => slot.id === id)) {
        return prev.map((slot) =>
          slot.id === id ? { ...slot, hideFromList: false } : slot,
        )
      }
      return [draft, ...prev]
    })
  }, [])

  const discardDeferredInvite = useCallback((id: number) => {
    pendingInvitesRef.current.delete(id)
    setSlots((prev) => prev.filter((slot) => slot.id !== id))
  }, [])

  const flushPendingInvites = useCallback(() => {
    const drafts = [...pendingInvitesRef.current.values()]
    pendingInvitesRef.current.clear()
    if (drafts.length === 0) return
    setSlots((prev) => {
      const existing = new Set(prev.map((slot) => slot.id))
      const fresh = drafts.filter((draft) => !existing.has(draft.id))
      if (fresh.length === 0) return prev
      return [...fresh, ...prev]
    })
  }, [])

  const inviteOnchain = useCallback(
    async (hop: InviteeHop, address: string, ensName?: string) => {
      setLoadingHop(hop)
      await new Promise((r) => setTimeout(r, 1500))
      const createdId = allocateInviteId()
      pendingInvitesRef.current.set(createdId, {
        id: createdId,
        status: 'onchain-pending',
        invitedAddress: address,
        ensName,
        inviteeHop: hop,
        invitedAt: new Date(),
      })
      setLoadingHop(null)
      return { id: createdId, address, ensName }
    },
    [allocateInviteId],
  )

  const inviteSlotOnchain = useCallback(
    async (slotId: number, address: string, ensName?: string) => {
      const hop: InviteeHop = slotId === 2 ? 2 : 1
      const created = await inviteOnchain(hop, address, ensName)
      const draft = pendingInvitesRef.current.get(created.id)
      pendingInvitesRef.current.delete(created.id)
      if (draft) {
        setSlots((prev) => [draft, ...prev])
      }
    },
    [inviteOnchain],
  )

  const value = useMemo<DemoSessionContextValue>(
    () => ({
      wallet,
      walletConnected: wallet != null,
      committedUsdc,
      hasParticipated,
      hopVariant,
      hopLabel,
      capUsdc: CAP,
      fillPct: Math.min(100, (committedUsdc / CAP) * 100),
      slots,
      inviteAllowance,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      consumeSelfInvites,
      generateInviteLink,
      generateSlotLink,
      revokeSlot,
      revealInviteInList,
      discardDeferredInvite,
      flushPendingInvites,
      inviteOnchain,
      inviteSlotOnchain,
      loadingHop,
      loadingSlotId: loadingHop,
    }),
    [
      wallet,
      committedUsdc,
      hasParticipated,
      hopVariant,
      hopLabel,
      slots,
      inviteAllowance,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      consumeSelfInvites,
      generateInviteLink,
      generateSlotLink,
      revokeSlot,
      revealInviteInList,
      discardDeferredInvite,
      flushPendingInvites,
      inviteOnchain,
      inviteSlotOnchain,
      loadingHop,
    ],
  )

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}

export function useDemoSession() {
  const ctx = useContext(DemoSessionContext)
  if (!ctx) {
    throw new Error('useDemoSession must be used within DemoSessionProvider')
  }
  return ctx
}

export function useDemoSessionOptional() {
  return useContext(DemoSessionContext)
}
