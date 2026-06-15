import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { CrowdfundLeftColumn } from '../components/CrowdfundLeftColumn'
import {
  HeroParticipantControls,
  HeroParticipantList,
  HeroParticipantsMobileStack,
  type HeroParticipant,
} from '../components/HeroParticipantsPanel'
import { Tag } from '../components/Tag/Tag'
import Tooltip from '../components/Tooltip/Tooltip'
import { InvitesCard } from '../components/MyPosition/InvitesCard'
import {
  ParticipateFlowCrowdfund,
  type ParticipateFlowCloseContext,
} from '../components/ParticipateFlow'
import Step1Wallet from '../components/ParticipateFlow/screens/Step1Wallet'
import { ParticipateFlowModal } from '../components/ParticipateFlow/ParticipateFlowModal'
import { DemoSessionProvider, useDemoSession } from '../context/DemoSessionContext'
import {
  CAP,
  formatArmAllocation,
  formatUsdcCommitted,
  buildInvitePinnedNodes,
} from '../components/MyPosition/myPositionDemo'
import { NodeSphere, type PinnedNode } from './NodeSphere'
import { generateDashboardParticipants, toHeroParticipants } from '../utils/mockParticipants'
import { MOBILE_LAYOUT_MAX_WIDTH_PX } from '../constants/viewportBreakpoints'
import mpStyles from '../components/MyPosition/MyPositionHero.module.css'
import shellStyles from './CrowdfundExperience.module.css'
import heroStyles from './Hero.module.css'

export type CrowdfundView = 'crowdfund' | 'myposition'

export interface CrowdfundExperienceProps {
  initialView?: CrowdfundView
}

function readInitialView(prop?: CrowdfundView): CrowdfundView {
  if (prop) return prop
  if (typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'myposition') return 'myposition'
  }
  return 'crowdfund'
}

const PANEL_EXIT_MS = 480
const PANEL_GAP_MS = 180
const PANEL_ENTER_MS = 480

function isMobileLayout() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`).matches
}

type PanelPhase = 'idle' | 'exit' | 'enter'

function layerClass(visible: boolean, motionReady: boolean, animate: boolean) {
  return [
    shellStyles.cornerLayer,
    visible ? shellStyles.cornerLayerVisible : shellStyles.cornerLayerHidden,
    !motionReady && shellStyles.cornerLayerMotionOff,
    motionReady && !animate && shellStyles.cornerLayerNoMotion,
  ]
    .filter(Boolean)
    .join(' ')
}

function panelVisible(view: CrowdfundView, layer: CrowdfundView, phase: PanelPhase) {
  if (phase === 'idle') return view === layer
  if (phase === 'exit') return false
  return view === layer
}

function panelAnimates(view: CrowdfundView, layer: CrowdfundView, phase: PanelPhase, motionReady: boolean) {
  if (!motionReady || phase === 'idle') return motionReady
  return view === layer
}

export function CrowdfundExperience(props: CrowdfundExperienceProps) {
  return (
    <DemoSessionProvider>
      <CrowdfundExperienceInner {...props} />
    </DemoSessionProvider>
  )
}

function CrowdfundExperienceInner({ initialView }: CrowdfundExperienceProps) {
  const session = useDemoSession()
  const {
    wallet,
    walletConnected,
    committedUsdc,
    hasParticipated,
    hopLabel,
    fillPct,
    slots,
    connectWallet,
    disconnectWallet,
    completeParticipation,
    generateSlotLink,
    revokeSlot,
    inviteSlotOnchain,
    loadingSlotId,
  } = session
  const scenario = useRef<{ participants: 800; seed: number } | null>(null)
  if (!scenario.current) {
    scenario.current = {
      participants: 800,
      seed: Math.floor(Math.random() * 1_000_000_000),
    }
  }

  const [view, setView] = useState<CrowdfundView>(() => readInitialView(initialView))
  const [graphMode, setGraphMode] = useState<CrowdfundView>(() => readInitialView(initialView))
  const [panelPhase, setPanelPhase] = useState<PanelPhase>('idle')
  const [motionReady, setMotionReady] = useState(() => isMobileLayout())
  const [mountGraph, setMountGraph] = useState(() => !isMobileLayout())
  const panelTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const committedAmount = 1_700_000

  const dashRows = useMemo(
    () => generateDashboardParticipants(scenario.current!.seed, scenario.current!.participants),
    [],
  )
  const participants = useMemo(() => toHeroParticipants(dashRows) as HeroParticipant[], [dashRows])

  const displayParticipants = useMemo(() => {
    if (!hasParticipated || !wallet) return participants
    const self: HeroParticipant = {
      address: wallet.displayAddress,
      hop: 'HOP-1',
      amountUsd: committedUsdc,
      isSelf: true,
    }
    return [self, ...participants.filter((p) => p.address !== wallet.displayAddress)]
  }, [participants, hasParticipated, wallet, committedUsdc])
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState<'all' | 'seed' | 'hop1' | 'hop2' | 'multihop'>('all')
  const [participantsListOpen, setParticipantsListOpen] = useState(false)
  const [holdColumnExpanded, setHoldColumnExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [participateOpen, setParticipateOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [pendingParticipateOpen, setPendingParticipateOpen] = useState(false)

  const participantsPanelRef = useRef<HTMLDivElement | null>(null)
  const mobileParticipantsRef = useRef<HTMLDivElement | null>(null)
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const isCrowdfund = view === 'crowdfund'
  const isMyPosition = view === 'myposition'
  const isGraphCrowdfund = graphMode === 'crowdfund'
  const isGraphMyPosition = graphMode === 'myposition'
  const graphParticipants = scenario.current!.participants

  useEffect(() => {
    if (isMobileLayout()) {
      setMotionReady(true)
      return
    }
    const id = requestAnimationFrame(() => setMotionReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!isMobileLayout()) {
      setMountGraph(true)
      return
    }

    let cancelled = false
    const mount = () => {
      if (!cancelled) setMountGraph(true)
    }

    let cleanup: () => void
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(mount, { timeout: 400 })
      cleanup = () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    } else {
      const timer = window.setTimeout(mount, 32)
      cleanup = () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }

    return cleanup
  }, [])

  useEffect(() => {
    return () => {
      if (panelTransitionTimer.current) clearTimeout(panelTransitionTimer.current)
    }
  }, [])

  const clearPanelTransition = () => {
    if (panelTransitionTimer.current) {
      clearTimeout(panelTransitionTimer.current)
      panelTransitionTimer.current = null
    }
  }

  const startPanelTransition = (next: CrowdfundView) => {
    if (view === next || panelPhase !== 'idle') return

    if (next === 'crowdfund') {
      setGraphMode('crowdfund')
      setSelectedAddress(undefined)
    } else if (next === 'myposition') {
      setGraphMode('myposition')
      setSelectedAddress(wallet?.displayAddress)
    }

    setPanelPhase('exit')
    clearPanelTransition()

    const mobile = isMobileLayout()
    const exitMs = mobile ? 0 : PANEL_EXIT_MS
    const gapMs = mobile ? 0 : PANEL_GAP_MS
    const enterMs = mobile ? 0 : PANEL_ENTER_MS

    panelTransitionTimer.current = setTimeout(() => {
      setView(next)
      syncUrl(next)
      setPanelPhase('enter')

      panelTransitionTimer.current = setTimeout(() => {
        setPanelPhase('idle')
        panelTransitionTimer.current = null
      }, enterMs)
    }, exitMs + gapMs)
  }

  useLayoutEffect(() => {
    const column = leftColumnRef.current
    const progressCard = column?.querySelector<HTMLElement>('[data-crowdfund-progress] > *')
    if (!progressCard) return

    const applyProgressCardHeight = () => {
      const h = Math.ceil(progressCard.getBoundingClientRect().height)
      if (h < 1) return false
      column
        ?.closest<HTMLElement>('[class*="leftCorner"]')
        ?.style.setProperty('--hero-progress-card-height', `${h}px`)
      return true
    }

    if (applyProgressCardHeight()) return

    const raf = requestAnimationFrame(() => {
      if (!applyProgressCardHeight()) requestAnimationFrame(applyProgressCardHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!isCrowdfund || !selectedAddress) return

    const onPointerDown = (e: PointerEvent) => {
      const desktop = participantsPanelRef.current
      const mobile = mobileParticipantsRef.current
      if (desktop?.contains(e.target as Node)) return
      if (mobile?.contains(e.target as Node)) return
      setSelectedAddress(undefined)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [selectedAddress, isCrowdfund])

  const syncUrl = (next: CrowdfundView) => {
    const base = import.meta.env.BASE_URL
    const path = next === 'myposition' ? `${base}?view=myposition` : base
    window.history.replaceState(null, '', path)
  }

  const goToMyPosition = () => {
    if (isMyPosition || panelPhase !== 'idle') return
    setParticipantsListOpen(false)
    startPanelTransition('myposition')
  }

  const goToCrowdfund = () => {
    if (isCrowdfund || panelPhase !== 'idle') return
    startPanelTransition('crowdfund')
  }

  const viewPositionFromParticipateFlow = () => {
    setParticipateOpen(false)
    setPendingParticipateOpen(false)
    goToMyPosition()
  }

  const closeParticipateFlow = ({ step }: ParticipateFlowCloseContext) => {
    setParticipateOpen(false)
    setPendingParticipateOpen(false)
    if (step === 'confirmation') goToMyPosition()
  }

  const handleDisconnectWallet = () => {
    setParticipateOpen(false)
    setConnectOpen(false)
    setPendingParticipateOpen(false)
    disconnectWallet()
  }

  const closeConnectModal = () => {
    setConnectOpen(false)
  }

  const openParticipateFlow = () => {
    if (isCrowdfund && panelPhase === 'idle') {
      setParticipateOpen(true)
      return
    }
    if (!isCrowdfund) {
      setPendingParticipateOpen(true)
      goToCrowdfund()
    }
  }

  useEffect(() => {
    if (!pendingParticipateOpen || !isCrowdfund || panelPhase !== 'idle') return
    setPendingParticipateOpen(false)
    setParticipateOpen(true)
  }, [pendingParticipateOpen, isCrowdfund, panelPhase])

  useEffect(() => {
    if (isMyPosition && !pendingParticipateOpen) {
      setParticipateOpen(false)
    }
  }, [isMyPosition, pendingParticipateOpen])

  useEffect(() => {
    if (!isMyPosition || walletConnected || panelPhase !== 'idle') return
    setView('crowdfund')
    setGraphMode('crowdfund')
    syncUrl('crowdfund')
  }, [isMyPosition, walletConnected, panelPhase])

  const crowdfundPanelVisible = panelVisible(view, 'crowdfund', panelPhase)
  const myPositionPanelVisible = panelVisible(view, 'myposition', panelPhase)
  const crowdfundPanelAnimates = panelAnimates(view, 'crowdfund', panelPhase, motionReady)
  const myPositionPanelAnimates = panelAnimates(view, 'myposition', panelPhase, motionReady)

  const handleCopy = (slotId: number, link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(slotId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const graphPinnedNodes = useMemo(() => {
    const pins: PinnedNode[] = displayParticipants.map((p) => ({
      kind:
        p.hop === 'SEED'
          ? ('Hop 0' as const)
          : p.hop === 'HOP-1'
            ? ('Hop 1' as const)
            : p.hop === 'HOP-2'
              ? ('Hop 2' as const)
              : ('Multi-hop' as const),
      address: p.address,
      committed: `$${p.amountUsd.toLocaleString()} committed`,
    }))

    if (wallet) {
      pins.push({
        kind: 'Your wallet',
        address: wallet.displayAddress,
        committed: `$${committedUsdc.toLocaleString()} committed`,
      })

      for (const pin of buildInvitePinnedNodes(slots, wallet.displayAddress, committedUsdc)) {
        if (pin.kind !== 'Your wallet') pins.push(pin)
      }
    }

    return pins
  }, [displayParticipants, wallet, committedUsdc, slots])

  // Only remount when graph structure changes — not on link create/revoke (link-active ↔ empty).
  const graphLayoutKey = useMemo(() => {
    const invitePinKey = slots
      .filter((s) => s.status === 'onchain-pending' || s.status === 'redeemed')
      .map((s) => `${s.id}:${s.status}:${s.invitedAddress ?? s.redeemedBy ?? ''}`)
      .join('|')
    return [
      scenario.current!.seed,
      walletConnected ? 'connected' : 'guest',
      hasParticipated ? committedUsdc : 0,
      invitePinKey,
    ].join('-')
  }, [slots, walletConnected, hasParticipated, committedUsdc])

  return (
    <div className={[mpStyles.page, shellStyles.page].join(' ')}>
      <Header
        layout="hero"
        activeNav={isMyPosition ? 'myposition' : 'crowdfund'}
        walletConnected={walletConnected}
        walletAddress={wallet?.displayAddress ?? ''}
        walletCopyAddress={wallet?.address}
        walletProvider={wallet?.provider}
        usdcBalance={0}
        onDisconnect={handleDisconnectWallet}
        autoHideOnScroll={false}
        className={[heroStyles.headerOverride, heroStyles.enter, heroStyles.enterHeader].join(' ')}
        onMyPosition={goToMyPosition}
        onCrowdfund={goToCrowdfund}
        onParticipate={openParticipateFlow}
        onConnectWallet={() => setConnectOpen(true)}
      />

      <div className={shellStyles.experienceLayout}>
        <div className={shellStyles.graphHost}>
          {mountGraph ? (
            <NodeSphere
              key={graphLayoutKey}
              highlightAddress={
                isGraphMyPosition ? selectedAddress ?? wallet?.displayAddress : selectedAddress
              }
              onSelectAddress={setSelectedAddress}
              filterKind={
                isGraphCrowdfund
                  ? filter === 'seed'
                    ? 'Hop 0'
                    : filter === 'hop1'
                      ? 'Hop 1'
                      : filter === 'hop2'
                        ? 'Hop 2'
                        : filter === 'multihop'
                          ? 'Multi-hop'
                          : undefined
                  : undefined
              }
              walletAddress={wallet?.displayAddress}
              lockOnWallet={isGraphMyPosition}
              inviteGraph={isGraphMyPosition}
              interactionDisabled={isGraphCrowdfund && participantsListOpen}
              scenarioParticipants={graphParticipants}
              scenarioSeed={scenario.current!.seed}
              pinnedNodes={graphPinnedNodes}
            />
          ) : null}
        </div>

        {isCrowdfund && crowdfundPanelVisible ? (
          <div ref={mobileParticipantsRef} className={shellStyles.mobileParticipantsStack}>
            <HeroParticipantsMobileStack
              participants={displayParticipants}
              selectedAddress={selectedAddress}
              onSelectAddress={setSelectedAddress}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
        ) : null}

        <div
          className={[
            heroStyles.leftCorner,
            shellStyles.leftCorner,
            isCrowdfund && participantsListOpen && heroStyles.leftCornerExpanded,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div
            className={layerClass(crowdfundPanelVisible, motionReady, crowdfundPanelAnimates)}
            aria-hidden={!crowdfundPanelVisible}
          >
            <div ref={leftColumnRef}>
              <CrowdfundLeftColumn
                className={[heroStyles.enter, heroStyles.enterProgress, shellStyles.mobileCrowdfundColumn]
                  .filter(Boolean)
                  .join(' ')}
                listOpen={participantsListOpen}
                onListOpenChange={setParticipantsListOpen}
                progress={
                  <Progress
                    participants={`${scenario.current!.participants} PARTICIPANTS`}
                    committedAmount={committedAmount}
                  />
                }
                list={
                  <HeroParticipantList
                    participants={displayParticipants}
                    selectedAddress={selectedAddress}
                    onSelectAddress={setSelectedAddress}
                    filter={filter}
                  />
                }
                controls={
                  <div ref={participantsPanelRef}>
                    <HeroParticipantControls filter={filter} onFilterChange={setFilter} />
                  </div>
                }
              />
            </div>
          </div>

          <div
            className={layerClass(myPositionPanelVisible, motionReady, myPositionPanelAnimates)}
            aria-hidden={!myPositionPanelVisible}
          >
            <section className={mpStyles.positionCard} aria-label="Your position">
              <div className={mpStyles.cardHeader}>
                <h1 className={mpStyles.pageTitle}>My Position</h1>
                <div className={mpStyles.metaTags}>
                  {wallet && <Tag label={wallet.displayAddress} dot="lavender" />}
                  <Tag label={hopLabel} dot="lavender" />
                </div>
              </div>

              <div className={mpStyles.positionFooter}>
                <div className={mpStyles.statsRow}>
                  <div className={mpStyles.statBlock}>
                    <p className={mpStyles.statLabel}>USDC committed</p>
                    <p className={mpStyles.statAmount}>{formatUsdcCommitted(committedUsdc)}</p>
                  </div>

                  <div className={mpStyles.statBlock}>
                    <div className={mpStyles.statLabelRow}>
                      <p className={mpStyles.statLabel}>ARM allocation</p>
                      <Tooltip variant="centered" content="Estimated · pending finalization">
                        <button
                          type="button"
                          className={mpStyles.infoTrigger}
                          aria-label="ARM allocation info"
                        >
                          <InformationCircleIcon className={mpStyles.infoIcon} aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                    <p className={mpStyles.statAmountAccent}>{formatArmAllocation(committedUsdc)}</p>
                  </div>
                </div>

                <div className={mpStyles.barSection}>
                  <div className={mpStyles.barTrack}>
                    <div className={mpStyles.barFill} style={{ width: `${fillPct}%` }} />
                  </div>
                  <div className={mpStyles.barLabels}>
                    <span className={mpStyles.barCaption}>{Math.round(fillPct)}% of cap</span>
                    <span className={mpStyles.barCaption}>Cap ${CAP.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className={[heroStyles.rightCorner, shellStyles.rightCorner].join(' ')}>
          <div
            className={[
              layerClass(crowdfundPanelVisible, motionReady, crowdfundPanelAnimates),
              shellStyles.rightParticipateLayer,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!crowdfundPanelVisible}
          >
            <Participate
              className={[heroStyles.enter, heroStyles.enterParticipate, shellStyles.mobileParticipateCard]
                .filter(Boolean)
                .join(' ')}
              imageSrc="/fleet.png"
              videoSrc="/fleet.mp4"
              onCtaClick={openParticipateFlow}
            />
          </div>

          <div
            className={layerClass(myPositionPanelVisible, motionReady, myPositionPanelAnimates)}
            aria-hidden={!myPositionPanelVisible}
          >
            <InvitesCard
              variant="hero"
              slots={slots}
              onGenerateLink={generateSlotLink}
              onCopy={handleCopy}
              onRevoke={revokeSlot}
              onInviteOnchain={inviteSlotOnchain}
              copiedSlotId={copiedId}
              loadingSlotId={loadingSlotId}
            />
          </div>
        </div>
      </div>

      <ParticipateFlowCrowdfund
        open={participateOpen && isCrowdfund}
        onClose={closeParticipateFlow}
        onViewPosition={viewPositionFromParticipateFlow}
        walletConnected={walletConnected}
        onConnectWallet={connectWallet}
        onCompleteParticipation={completeParticipation}
        hasParticipated={hasParticipated}
        committedUsdc={committedUsdc}
        slots={slots}
        onGenerateSlotLink={generateSlotLink}
        onRevokeSlot={revokeSlot}
        onInviteSlotOnchain={inviteSlotOnchain}
        onCopySlotLink={handleCopy}
        loadingSlotId={loadingSlotId}
        copiedSlotId={copiedId}
      />

      <ParticipateFlowModal
        open={connectOpen}
        onClose={closeConnectModal}
        ariaLabel="Select your wallet"
      >
        <Step1Wallet
          showSteps={false}
          compact
          onNext={(provider) => {
            connectWallet(provider)
            setConnectOpen(false)
          }}
        />
      </ParticipateFlowModal>
    </div>
  )
}
