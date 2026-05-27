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
  readDemoSession,
  writeDemoSession,
} from './demoSessionStorage'

const INITIAL_SLOTS: SlotData[] = [
  { id: 1, status: 'empty' },
  { id: 2, status: 'empty' },
  { id: 3, status: 'empty' },
]

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
  generateSlotLink: (slotId: number) => Promise<void>
  revokeSlot: (slotId: number) => void
  inviteSlotOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  loadingSlotId: number | null
}

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null)

function loadInitialSession() {
  const stored = readDemoSession()
  if (!stored) {
    return {
      wallet: null as DemoWallet | null,
      committedUsdc: 0,
      hasParticipated: false,
      slots: INITIAL_SLOTS.map((slot) => ({ ...slot })),
    }
  }

  return {
    wallet: stored.wallet,
    committedUsdc: stored.committedUsdc,
    hasParticipated: stored.hasParticipated,
    slots:
      stored.slots.length > 0
        ? stored.slots
        : INITIAL_SLOTS.map((slot) => ({ ...slot })),
  }
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadInitialSession)
  const [wallet, setWallet] = useState<DemoWallet | null>(initial.wallet)
  const [committedUsdc, setCommittedUsdc] = useState(initial.committedUsdc)
  const [hasParticipated, setHasParticipated] = useState(initial.hasParticipated)
  const [slots, setSlots] = useState<SlotData[]>(initial.slots)
  const [loadingSlotId, setLoadingSlotId] = useState<number | null>(null)

  useEffect(() => {
    writeDemoSession({ wallet, committedUsdc, hasParticipated, slots })
  }, [wallet, committedUsdc, hasParticipated, slots])

  const hopVariant: HopVariant = 'hop-1'
  const hopLabel = 'HOP-1'

  const connectWallet = useCallback((provider: string) => {
    if (!isProviderWhitelisted(provider)) return
    setWallet({
      provider,
      address: DEMO_WALLET,
      displayAddress: DEMO_WALLET_DISPLAY,
    })
  }, [])

  const disconnectWallet = useCallback(() => {
    setWallet(null)
    clearDemoSession()
  }, [])

  const completeParticipation = useCallback((amountUsdc: number) => {
    setCommittedUsdc((prev) => prev + amountUsdc)
    setHasParticipated(true)
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
      fillPct: (committedUsdc / CAP) * 100,
      slots,
      connectWallet,
      disconnectWallet,
      completeParticipation,
      generateSlotLink,
      revokeSlot,
      inviteSlotOnchain,
      loadingSlotId,
    }),
    [
      wallet,
      committedUsdc,
      hasParticipated,
      slots,
      connectWallet,
      disconnectWallet,
      completeParticipation,
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
