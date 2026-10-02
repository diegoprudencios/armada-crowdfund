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
import { DEMO_WALLET, DEMO_WALLET_DISPLAY } from '../components/MyPosition/myPositionDemo'
import {
  clearDemoSession,
  isPageReload,
  readDemoSession,
  writeDemoSession,
} from './demoSessionStorage'
import {
  claimModeForSale,
  isClaimReady,
  readSalePresetFromUrl,
  saleFromPreset,
  type DemoSalePhase,
  type DemoSalePreset,
} from '../lib/demoSaleLifecycle'
import { createDemoInviteLink } from '../lib/demoInviteLink'
import {
  addressesEqual,
  applyDemoHopCommit,
  applyDemoOutgoingInvite,
  applyDemoSelfFillPlan,
  computeDemoSelfFillPlan,
  currentCeilingUsdc,
  DEMO_HOP_CONFIGS,
  hopVariantFromState,
  initialHop0State,
  initialHop1State,
  initialHop2State,
  inviteAllowanceFromState,
  remainingOnCurrentHops,
  totalCommitted,
  type DemoSelfFillPlan,
  type DemoSelfFillState,
} from '../lib/demoSelfFill'

const HOP_LABEL: Record<HopVariant, string> = {
  seed: 'HOP-0',
  'hop-1': 'HOP-1',
  'hop-2': 'HOP-2',
  'multi-hop': 'MULTI-HOP',
}

function hopStateForVariant(variant: HopVariant): DemoSelfFillState {
  if (variant === 'seed') return initialHop0State()
  if (variant === 'hop-2') return initialHop2State()
  if (variant === 'multi-hop') return initialHop0State()
  return initialHop1State()
}

function createFreshSession() {
  const fromUrl = readSalePresetFromUrl()
  const sale = saleFromPreset(fromUrl ?? 'active')
  // Crowdfund demo defaults to hop-0 so Max out can show the full $33k self-fill tree.
  const hopState = initialHop0State()
  return {
    wallet: null as DemoWallet | null,
    hopState,
    hasParticipated: false,
    hopVariant: hopVariantFromState(hopState) as HopVariant,
    slots: [] as SlotData[],
    inviteAllowance: inviteAllowanceFromState(hopState),
    salePhase: sale.phase,
    windowOpen: sale.windowOpen,
    saleBelowMin: sale.saleBelowMin,
    armClaimed: false,
    refundClaimed: false,
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
  /** Current-hop ceiling (no new self-invites) — Step2Commit MAX. */
  capUsdc: number
  /** Projected ceiling after full self-fill — Max out banner. */
  maxOutCeilingUsdc: number
  /** Remaining USDC on currently held hops. */
  remainingHopUsdc: number
  fillPct: number
  hopState: DemoSelfFillState
  maxOutPlan: DemoSelfFillPlan
  slots: SlotData[]
  inviteAllowance: InviteAllowance
  salePhase: DemoSalePhase
  windowOpen: boolean
  saleBelowMin: boolean
  armClaimed: boolean
  refundClaimed: boolean
  claimReady: boolean
  claimMode: 'arm' | 'refund'
  hasClaimed: boolean
  connectWallet: (provider: string) => void
  disconnectWallet: () => void
  completeParticipation: (amountUsdc: number) => void
  /** Apply POC-style self-fill plan (spend invites on self + multi-hop commits). */
  applyMaxOutPlan: (plan: DemoSelfFillPlan) => void
  /** @deprecated Prefer applyMaxOutPlan. */
  consumeSelfInvites: (inviteCount: number) => void
  setSalePreset: (preset: DemoSalePreset) => void
  completeClaim: () => void
  generateInviteLink: (hop: InviteeHop) => Promise<{
    id: number
    link: string
    expiresAt: Date
  }>
  generateSlotLink: (slotId: number) => Promise<void>
  revokeSlot: (slotId: number) => Promise<void>
  revealInviteInList: (id: number) => void
  discardDeferredInvite: (id: number) => void
  flushPendingInvites: () => void
  inviteOnchain: (
    hop: InviteeHop,
    address: string,
    ensName?: string,
  ) => Promise<{ id: number; address: string; ensName?: string }>
  inviteSlotOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  loadingHop: InviteeHop | null
  loadingSlotId: number | null
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null)

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const stored = typeof window !== 'undefined' ? readDemoSession() : null
  const boot = stored ?? createFreshSession()

  // Migrate older sessions that only stored a flat committedUsdc.
  const initialHopState: DemoSelfFillState = (() => {
    if (stored && 'hopState' in stored && stored.hopState) {
      return stored.hopState as DemoSelfFillState
    }
    const base = hopStateForVariant(
      (stored?.hopVariant as HopVariant | undefined) ?? 'seed',
    )
    const committed = stored?.committedUsdc ?? 0
    if (committed <= 0) return base
    return applyDemoHopCommit(base, committed)
  })()

  const [wallet, setWallet] = useState<DemoWallet | null>(boot.wallet)
  const [hopState, setHopState] = useState<DemoSelfFillState>(initialHopState)
  const [hasParticipated, setHasParticipated] = useState(boot.hasParticipated)
  const [slots, setSlots] = useState<SlotData[]>(boot.slots)
  const [inviteAllowance, setInviteAllowance] = useState<InviteAllowance>(
    boot.inviteAllowance?.hop1 != null
      ? boot.inviteAllowance
      : inviteAllowanceFromState(initialHopState),
  )
  const [salePhase, setSalePhase] = useState(boot.salePhase)
  const [windowOpen, setWindowOpen] = useState(boot.windowOpen)
  const [saleBelowMin, setSaleBelowMin] = useState(boot.saleBelowMin)
  const [armClaimed, setArmClaimed] = useState(boot.armClaimed)
  const [refundClaimed, setRefundClaimed] = useState(boot.refundClaimed)
  const [loadingHop, setLoadingHop] = useState<InviteeHop | null>(null)

  const pendingInvitesRef = useRef<Map<number, SlotData>>(new Map())
  const nextIdRef = useRef(nextInviteId(boot.slots))

  const allocateInviteId = useCallback(() => {
    const id = nextIdRef.current
    nextIdRef.current += 1
    return id
  }, [])

  const committedUsdc = totalCommitted(hopState)
  const hopVariant = hopVariantFromState(hopState)
  const hopLabel = HOP_LABEL[hopVariant]
  const capUsdc = currentCeilingUsdc(hopState)
  const remainingHopUsdc = remainingOnCurrentHops(hopState)
  const maxOutPlan = useMemo(() => computeDemoSelfFillPlan(hopState), [hopState])
  const fillPct = capUsdc > 0 ? Math.min(100, (committedUsdc / capUsdc) * 100) : 0

  const claimMode = claimModeForSale({
    phase: salePhase,
    windowOpen,
    saleBelowMin,
  })
  const claimReady = isClaimReady({ phase: salePhase, windowOpen, saleBelowMin })
  const hasClaimed = claimMode === 'refund' ? refundClaimed : armClaimed

  useEffect(() => {
    if (isPageReload()) clearDemoSession()
  }, [])

  useEffect(() => {
    writeDemoSession({
      wallet,
      committedUsdc,
      hasParticipated,
      hopVariant,
      hopState,
      slots,
      inviteAllowance,
      salePhase,
      windowOpen,
      saleBelowMin,
      armClaimed,
      refundClaimed,
    })
  }, [
    wallet,
    committedUsdc,
    hasParticipated,
    hopVariant,
    hopState,
    slots,
    inviteAllowance,
    salePhase,
    windowOpen,
    saleBelowMin,
    armClaimed,
    refundClaimed,
  ])

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
    setHopState(fresh.hopState)
    setHasParticipated(fresh.hasParticipated)
    setSlots(fresh.slots)
    setInviteAllowance(fresh.inviteAllowance)
    setSalePhase(fresh.salePhase)
    setWindowOpen(fresh.windowOpen)
    setSaleBelowMin(fresh.saleBelowMin)
    setArmClaimed(fresh.armClaimed)
    setRefundClaimed(fresh.refundClaimed)
    setLoadingHop(null)
    pendingInvitesRef.current.clear()
  }, [])

  const completeParticipation = useCallback((amountUsdc: number) => {
    setHopState((prev) => applyDemoHopCommit(prev, amountUsdc))
    setHasParticipated(true)
  }, [])

  const applyMaxOutPlan = useCallback((plan: DemoSelfFillPlan) => {
    setHopState((prev) => applyDemoSelfFillPlan(prev, plan))
    setHasParticipated(true)
    // Record self-invites as redeemed slots so the invite list / allowance math
    // shows zero friend invites left (budget spent on self).
    setSlots((prev) => {
      const next = [...prev]
      let id = nextInviteId(prev)
      const now = new Date()
      for (const inv of plan.invites) {
        const inviteeHop = (inv.fromHop + 1) as InviteeHop
        for (let i = 0; i < inv.count; i++) {
          next.push({
            id: id++,
            status: 'redeemed',
            redeemedBy: DEMO_WALLET,
            joinedAt: now,
            invitedAt: now,
            inviteeHop,
            hideFromList: true,
          })
        }
      }
      return next
    })
    setInviteAllowance({
      hop1: plan.projectedReceivedByHop[0] * 3,
      hop2: plan.projectedReceivedByHop[1] * 2,
    })
  }, [])

  const consumeSelfInvites = useCallback(
    (inviteCount: number) => {
      if (inviteCount <= 0) return
      const plan = computeDemoSelfFillPlan(hopState)
      if (plan.totalInvites > 0) applyMaxOutPlan(plan)
    },
    [hopState, applyMaxOutPlan],
  )

  const setSalePreset = useCallback((preset: DemoSalePreset) => {
    const sale = saleFromPreset(preset)
    setSalePhase(sale.phase)
    setWindowOpen(sale.windowOpen)
    setSaleBelowMin(sale.saleBelowMin)
    if (preset === 'active' || preset === 'closed' || preset === 'below-min') {
      setArmClaimed(false)
      setRefundClaimed(false)
    }
    const url = new URL(window.location.href)
    url.searchParams.set('sale', preset)
    window.history.replaceState({}, '', url.toString())
  }, [])

  const completeClaim = useCallback(() => {
    if (claimMode === 'refund') setRefundClaimed(true)
    else setArmClaimed(true)
  }, [claimMode])

  const commitOutgoingInvite = useCallback(
    (draft: SlotData, selfAddress: string | null | undefined) => {
      const hop = draft.inviteeHop
      if (hop !== 1 && hop !== 2) return draft

      const selfInvite = addressesEqual(draft.invitedAddress, selfAddress)
      setHopState((prev) =>
        applyDemoOutgoingInvite(prev, hop, { selfInvite }),
      )

      if (selfInvite && hop === 1) {
        // Each hop-1 slot unlocks maxInvites outgoing hop-2 invites (POC).
        setInviteAllowance((prev) => ({
          ...prev,
          hop2: prev.hop2 + DEMO_HOP_CONFIGS[1].maxInvites,
        }))
      }

      if (!selfInvite || !selfAddress) return draft
      // POC `invite(self)` lands immediately as a redeemed self-slot.
      return {
        ...draft,
        status: 'redeemed' as const,
        redeemedBy: selfAddress,
        joinedAt: draft.joinedAt ?? new Date(),
      }
    },
    [],
  )

  const generateInviteLink = useCallback(
    async (hop: InviteeHop) => {
      setLoadingHop(hop)
      await new Promise((r) => setTimeout(r, 1200))
      const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      const link = createDemoInviteLink(`hop-${hop}`)
      const createdId = allocateInviteId()
      const draft: SlotData = {
        id: createdId,
        status: 'link-active',
        link,
        expiresAt,
        inviteeHop: hop,
        invitedAt: new Date(),
        // Occupies the slot immediately; list row reveals on Done.
        hideFromList: true,
      }
      const selfAddress = wallet?.address ?? DEMO_WALLET
      const committed = commitOutgoingInvite(draft, selfAddress)
      pendingInvitesRef.current.set(createdId, committed)
      setSlots((prev) => [committed, ...prev])
      setLoadingHop(null)
      return { id: createdId, link, expiresAt }
    },
    [allocateInviteId, commitOutgoingInvite, wallet?.address],
  )

  const generateSlotLink = useCallback(
    async (slotId: number) => {
      const hop: InviteeHop = slotId === 2 ? 2 : 1
      await generateInviteLink(hop)
    },
    [generateInviteLink],
  )

  const revokeSlot = useCallback(async (slotId: number) => {
    pendingInvitesRef.current.delete(slotId)
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'revoked' as const, closedAt: new Date(), hideFromList: false }
          : s,
      ),
    )
  }, [])

  const revealInviteInList = useCallback((id: number) => {
    pendingInvitesRef.current.delete(id)
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, hideFromList: false } : s)),
    )
  }, [])

  const discardDeferredInvite = useCallback((id: number) => {
    pendingInvitesRef.current.delete(id)
    // Free the slot again (same as revoke / unused after expiry).
    setSlots((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: 'revoked' as const, closedAt: new Date(), hideFromList: false }
          : s,
      ),
    )
  }, [])

  const flushPendingInvites = useCallback(() => {
    if (pendingInvitesRef.current.size === 0) return
    const ids = new Set(pendingInvitesRef.current.keys())
    pendingInvitesRef.current.clear()
    setSlots((prev) =>
      prev.map((s) => (ids.has(s.id) ? { ...s, hideFromList: false } : s)),
    )
  }, [])

  const inviteOnchain = useCallback(
    async (hop: InviteeHop, address: string, ensName?: string) => {
      setLoadingHop(hop)
      await new Promise((r) => setTimeout(r, 1200))
      const createdId = allocateInviteId()
      const draft: SlotData = {
        id: createdId,
        status: 'onchain-pending',
        invitedAddress: address,
        ensName,
        inviteeHop: hop,
        invitedAt: new Date(),
        hideFromList: true,
      }
      const selfAddress = wallet?.address ?? DEMO_WALLET
      const committed = commitOutgoingInvite(draft, selfAddress)
      pendingInvitesRef.current.set(createdId, committed)
      setSlots((prev) => [committed, ...prev])
      setLoadingHop(null)
      return { id: createdId, address, ensName }
    },
    [allocateInviteId, commitOutgoingInvite, wallet?.address],
  )

  const inviteSlotOnchain = useCallback(
    async (slotId: number, address: string, ensName?: string) => {
      const hop: InviteeHop = slotId === 2 ? 2 : 1
      await inviteOnchain(hop, address, ensName)
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
      capUsdc,
      maxOutCeilingUsdc: maxOutPlan.projectedCeilingUsdc,
      remainingHopUsdc,
      fillPct,
      hopState,
      maxOutPlan,
      slots,
      inviteAllowance,
      salePhase,
      windowOpen,
      saleBelowMin,
      armClaimed,
      refundClaimed,
      claimReady,
      claimMode,
      hasClaimed,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      applyMaxOutPlan,
      consumeSelfInvites,
      setSalePreset,
      completeClaim,
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
      capUsdc,
      maxOutPlan,
      remainingHopUsdc,
      fillPct,
      hopState,
      slots,
      inviteAllowance,
      salePhase,
      windowOpen,
      saleBelowMin,
      armClaimed,
      refundClaimed,
      claimReady,
      claimMode,
      hasClaimed,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      applyMaxOutPlan,
      consumeSelfInvites,
      setSalePreset,
      completeClaim,
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
