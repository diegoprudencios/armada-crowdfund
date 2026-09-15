import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { HopVariant } from '../components/HopPill/HopPill'
import type { SlotData } from '../components/InviteFlow/screens/SlotCard'
import { isProviderWhitelisted } from '../components/ParticipateFlow/participateFlowWallets'
import { CAP, DEMO_WALLET, DEMO_WALLET_DISPLAY } from '../components/MyPosition/myPositionDemo'
import {
  clearDemoSession,
  isPageReload,
  readDemoSession,
  writeDemoSession,
} from './demoSessionStorage'

const INITIAL_SLOTS: SlotData[] = [
  { id: 1, status: 'empty' },
  { id: 2, status: 'empty' },
  { id: 3, status: 'empty' },
]

const HOP_LABEL: Record<HopVariant, string> = {
  seed: 'HOP-0',
  'hop-1': 'HOP-1',
  'hop-2': 'HOP-2',
  'multi-hop': 'MULTI-HOP',
}

function freshSlots() {
  return INITIAL_SLOTS.map((slot) => ({ ...slot }))
}

function createFreshSession() {
  return {
    wallet: null as DemoWallet | null,
    committedUsdc: 0,
    hasParticipated: false,
    hopVariant: 'hop-1' as HopVariant,
    slots: freshSlots(),
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
  connectWallet: (provider: string) => void
  disconnectWallet: () => void
  completeParticipation: (amountUsdc: number) => void
  consumeSelfInvites: (inviteCount: number) => void
  generateSlotLink: (slotId: number) => Promise<void>
  revokeSlot: (slotId: number) => void
  inviteSlotOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
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
    slots: stored.slots.length > 0 ? stored.slots : freshSlots(),
  }
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitialSession)
  const [wallet, setWallet] = useState<DemoWallet | null>(initial.wallet)
  const [committedUsdc, setCommittedUsdc] = useState(initial.committedUsdc)
  const [hasParticipated, setHasParticipated] = useState(initial.hasParticipated)
  const [hopVariant, setHopVariant] = useState<HopVariant>(initial.hopVariant)
  const [slots, setSlots] = useState<SlotData[]>(initial.slots)
  const [loadingSlotId, setLoadingSlotId] = useState<number | null>(null)

  useEffect(() => {
    writeDemoSession({ wallet, committedUsdc, hasParticipated, hopVariant, slots })
  }, [wallet, committedUsdc, hasParticipated, hopVariant, slots])

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
    setLoadingSlotId(null)
  }, [])

  const completeParticipation = useCallback((amountUsdc: number) => {
    setCommittedUsdc((prev) => Math.min(CAP, prev + amountUsdc))
    setHasParticipated(true)
  }, [])

  /**
   * Self-fill max-out: spend empty invite slots on yourself and promote to multi-hop
   * (same address, multiple hop positions — mirrors committer / treeLayout merge).
   */
  const consumeSelfInvites = useCallback((inviteCount: number) => {
    if (inviteCount <= 0) return
    setHopVariant('multi-hop')
    setSlots((prev) => {
      let remaining = inviteCount
      return prev.map((slot) => {
        if (remaining <= 0 || slot.status !== 'empty') return slot
        remaining -= 1
        return {
          ...slot,
          status: 'redeemed' as const,
          redeemedBy: DEMO_WALLET,
          joinedAt: new Date(),
          // Self-fill unlocks the next hop(s); mark as hop-2 invitee for demo fidelity.
          inviteeHop: 2 as const,
        }
      })
    })
  }, [])

  const generateSlotLink = useCallback(async (slotId: number) => {
    setLoadingSlotId(slotId)
    await new Promise((r) => setTimeout(r, 1200))
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const link = `https://armada.wtf/join?invite=${Math.random().toString(36).slice(2, 10)}&hop=hop-1`
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, status: 'link-active', link, expiresAt } : slot,
      ),
    )
    setLoadingSlotId(null)
  }, [])

  const revokeSlot = useCallback((slotId: number) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { id: slot.id, status: 'empty' } : slot)),
    )
  }, [])

  const inviteSlotOnchain = useCallback(
    async (slotId: number, address: string, ensName?: string) => {
      setLoadingSlotId(slotId)
      await new Promise((r) => setTimeout(r, 1500))
      setSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId
            ? { ...slot, status: 'onchain-pending', invitedAddress: address, ensName }
            : slot,
        ),
      )
      setLoadingSlotId(null)
    },
    [],
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
      connectWallet,
      disconnectWallet,
      completeParticipation,
      consumeSelfInvites,
      generateSlotLink,
      revokeSlot,
      inviteSlotOnchain,
      loadingSlotId,
    }),
    [
      wallet,
      committedUsdc,
      hasParticipated,
      hopVariant,
      hopLabel,
      slots,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      consumeSelfInvites,
      generateSlotLink,
      revokeSlot,
      inviteSlotOnchain,
      loadingSlotId,
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
