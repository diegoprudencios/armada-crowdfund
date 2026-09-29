import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Header } from '../components/Header'
import { Button } from '../components/Button'
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
import { MyPositionEmptyState } from '../components/MyPosition/MyPositionEmptyState'
import {
  ParticipateFlowCrowdfund,
  type ParticipateFlowCloseContext,
} from '../components/ParticipateFlow'
import Step1Wallet from '../components/ParticipateFlow/screens/Step1Wallet'
import { ParticipateFlowModal } from '../components/ParticipateFlow/ParticipateFlowModal'
import { ClaimFlow } from '../components/ClaimFlow/ClaimFlow'
import { DemoSessionProvider, useDemoSession } from '../context/DemoSessionContext'
import {
  formatSaleStatusLabel,
  type DemoSalePreset,
} from '../lib/demoSaleLifecycle'
import {
  formatArmAllocation,
  formatUsdcCommitted,
  buildInvitePinnedNodes,
} from '../components/MyPosition/myPositionDemo'
import { NodeSphere, type PinnedNode } from './NodeSphere'
import { generateDashboardParticipants, toHeroParticipants } from '../utils/mockParticipants'
import { MOBILE_LAYOUT_MAX_WIDTH_PX } from '../constants/viewportBreakpoints'
import heroStyles from './Hero.module.css'
import mpStyles from '../components/MyPosition/MyPositionHero.module.css'
import shellStyles from './CrowdfundExperience.module.css'

export type CrowdfundView = 'crowdfund' | 'myposition'

export interface CrowdfundExperienceProps {
  initialView?: CrowdfundView
}

function readInitialView(prop?: CrowdfundView): CrowdfundView {
  if (prop === 'crowdfund' || prop === 'myposition') return prop
  if (typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v === 'myposition') return 'myposition'
  }
  return 'crowdfund'
}

function readInitialClaimOpen(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('view') === 'claim'
}

function readInitialSelectAddress(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const select = new URLSearchParams(window.location.search).get('select')
  return select && select.length > 0 ? select : undefined
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

function panelVisible(view: CrowdfundView, layer: 'crowdfund' | 'myposition', phase: PanelPhase) {
  if (phase === 'idle') return view === layer
  if (phase === 'exit') return false
  return view === layer
}

function panelAnimates(
  view: CrowdfundView,
  layer: 'crowdfund' | 'myposition',
  phase: PanelPhase,
  motionReady: boolean,
) {
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
    hopVariant,
    hopLabel,
    fillPct,
    capUsdc,
    remainingHopUsdc,
    maxOutPlan,
    slots,
    inviteAllowance,
    connectWallet,
    disconnectWallet,
    completeParticipation,
    applyMaxOutPlan,
    setSalePreset,
    completeClaim,
    claimReady,
    claimMode,
    hasClaimed,
    windowOpen,
    salePhase,
    saleBelowMin,
    generateInviteLink,
    revokeSlot,
    revealInviteInList,
    discardDeferredInvite,
    flushPendingInvites,
    inviteOnchain,
    loadingHop,
  } = session
  const scenario = useRef<{ participants: 800; seed: number } | null>(null)
  if (!scenario.current) {
    scenario.current = {
      participants: 800,
      seed: Math.floor(Math.random() * 1_000_000_000),
    }
  }

  const [view, setView] = useState<CrowdfundView>(() => readInitialView(initialView))
  const [graphMode, setGraphMode] = useState<'crowdfund' | 'myposition'>(() =>
    readInitialView(initialView),
  )
  const [claimOpen, setClaimOpen] = useState(() => readInitialClaimOpen())
  const [panelPhase, setPanelPhase] = useState<PanelPhase>('idle')
  const [motionReady, setMotionReady] = useState(() => isMobileLayout())
  const [mountGraph, setMountGraph] = useState(() => !isMobileLayout())
  const panelTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const committedAmount = saleBelowMin ? 800_000 : 1_700_000
  const saleStatus = formatSaleStatusLabel(salePhase, windowOpen)
  const participationEnabled = windowOpen && !claimReady && salePhase !== 2
  const awaitingFinalize = claimReady && salePhase === 0 && saleBelowMin
  const armAllocLabel =
    salePhase >= 1 || !windowOpen
      ? claimMode === 'refund'
        ? formatUsdcCommitted(committedUsdc)
        : formatArmAllocation(committedUsdc)
      : formatArmAllocation(committedUsdc)
  const armTooltip =
    hasClaimed
      ? 'Claimed'
      : salePhase >= 1
        ? claimMode === 'refund'
          ? 'USDC refund available'
          : 'Final ARM allocation'
        : 'Estimated · pending finalization'

  const dashRows = useMemo(
    () => generateDashboardParticipants(scenario.current!.seed, scenario.current!.participants),
    [],
  )
  const participants = useMemo(() => toHeroParticipants(dashRows) as HeroParticipant[], [dashRows])

  const displayParticipants = useMemo(() => {
    if (!hasParticipated || !wallet) return participants
    const self: HeroParticipant = {
      address: wallet.displayAddress,
      hop: hopVariant === 'multi-hop' ? 'MULTI-HOP' : hopVariant === 'hop-2' ? 'HOP-2' : hopVariant === 'seed' ? 'HOP-0' : 'HOP-1',
      amountUsd: committedUsdc,
      isSelf: true,
    }
    return [self, ...participants.filter((p) => p.address !== wallet.displayAddress)]
  }, [participants, hasParticipated, wallet, committedUsdc, hopVariant])
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(() =>
    readInitialSelectAddress(),
  )
  const [filter, setFilter] = useState<'all' | 'seed' | 'hop1' | 'hop2' | 'multihop'>('all')
  const [participantsListOpen, setParticipantsListOpen] = useState(false)
  const [holdColumnExpanded, setHoldColumnExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [inviteListOpen, setInviteListOpen] = useState(false)
  const [participateOpen, setParticipateOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [pendingParticipateOpen, setPendingParticipateOpen] = useState(false)

  const participantsPanelRef = useRef<HTMLDivElement | null>(null)
  const mobileParticipantsRef = useRef<HTMLDivElement | null>(null)
  const leftColumnRef = useRef<HTMLDivElement | null>(null)
  const graphHostRef = useRef<HTMLDivElement | null>(null)
  const isCrowdfund = view === 'crowdfund'
  const isMyPosition = view === 'myposition'
  const isGraphCrowdfund = graphMode === 'crowdfund'
  const isGraphMyPosition = graphMode === 'myposition'
  const graphParticipants = scenario.current!.participants

  const SALE_PRESETS: { id: DemoSalePreset; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'closed', label: 'Closed' },
    { id: 'below-min', label: 'Below min' },
    { id: 'finalized', label: 'Finalized' },
    { id: 'finalized-refund', label: 'Finalized · refund' },
    { id: 'cancelled', label: 'Cancelled' },
  ]

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

  const startPanelTransition = (
    next: 'crowdfund' | 'myposition',
    options?: { selectAddress?: string },
  ) => {
    setClaimOpen(false)

    if (view === next || panelPhase !== 'idle') {
      if (view === next && next === 'crowdfund' && options?.selectAddress) {
        setSelectedAddress(options.selectAddress)
        setGraphMode('crowdfund')
      }
      if (view === next) syncUrl(next, false)
      return
    }

    if (next === 'crowdfund') {
      setGraphMode('crowdfund')
      setSelectedAddress(options?.selectAddress)
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
      syncUrl(next, false)
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

    // Deselect when clicking outside the graph + participants chrome.
    // The graph is excluded so a drag start does not clear selection —
    // NodeSphere owns click-vs-drag (empty click → deselect).
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (graphHostRef.current?.contains(t)) return
      const desktop = participantsPanelRef.current
      const mobile = mobileParticipantsRef.current
      if (desktop?.contains(t)) return
      if (mobile?.contains(t)) return
      setSelectedAddress(undefined)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [selectedAddress, isCrowdfund])

  const syncUrl = (next: CrowdfundView, claim = claimOpen) => {
    const base = import.meta.env.BASE_URL
    const url = new URL(base, window.location.origin)
    if (claim) url.searchParams.set('view', 'claim')
    else if (next === 'myposition') url.searchParams.set('view', 'myposition')
    const sale = new URLSearchParams(window.location.search).get('sale')
    if (sale) url.searchParams.set('sale', sale)
    window.history.replaceState(null, '', `${url.pathname}${url.search}`)
  }

  const goToMyPosition = () => {
    if (claimOpen) {
      setClaimOpen(false)
      if (isMyPosition) {
        syncUrl('myposition', false)
        return
      }
    }
    if (isMyPosition || panelPhase !== 'idle') return
    setParticipantsListOpen(false)
    startPanelTransition('myposition')
  }

  const goToCrowdfund = () => {
    if (claimOpen) {
      setClaimOpen(false)
      if (isCrowdfund) {
        syncUrl('crowdfund', false)
        return
      }
    }
    if (isCrowdfund || panelPhase !== 'idle') return
    startPanelTransition('crowdfund')
  }

  const goToClaim = () => {
    if (!claimReady || claimOpen) return
    setParticipateOpen(false)
    setParticipantsListOpen(false)
    setClaimOpen(true)
    syncUrl(view, true)
  }

  const closeClaimFlow = () => {
    setClaimOpen(false)
    syncUrl(view, false)
  }

  useEffect(() => {
    if (claimOpen && !claimReady) {
      setClaimOpen(false)
      syncUrl(view, false)
    }
  }, [claimOpen, claimReady, view])

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
    if (!participationEnabled) return
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

  const myPositionEmptyKind: 'disconnected' | 'no-position' | null = !walletConnected
    ? 'disconnected'
    : !hasParticipated
      ? 'no-position'
      : null

  const crowdfundPanelVisible = panelVisible(view, 'crowdfund', panelPhase)
  const myPositionPanelVisible = panelVisible(view, 'myposition', panelPhase)
  const crowdfundPanelAnimates = panelAnimates(view, 'crowdfund', panelPhase, motionReady)
  const myPositionPanelAnimates = panelAnimates(view, 'myposition', panelPhase, motionReady)

  const handleCopy = (slotId: number, link: string) => {
    void navigator.clipboard.writeText(link)
    setCopiedId(slotId)
    setTimeout(() => setCopiedId(null), 1200)
  }

  const handleInviteListOpenChange = useCallback((open: boolean) => {
    setInviteListOpen(open)
  }, [])

  const graphPinnedNodes = useMemo(() => {
    const pins: PinnedNode[] = displayParticipants
      .filter((p) => !wallet || p.address !== wallet.displayAddress)
      .map((p) => ({
        kind:
          p.hop === 'HOP-0'
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
      const invitePins = buildInvitePinnedNodes(
        slots,
        wallet.displayAddress,
        committedUsdc,
      )
      for (const pin of invitePins) {
        pins.push(pin)
      }
    }

    return pins
  }, [displayParticipants, wallet, committedUsdc, slots])

  // Remount only when wallet / participation structure changes — invite
  // actions (link or onchain) must not reshuffle node positions.
  const graphLayoutKey = useMemo(() => {
    return [
      scenario.current!.seed,
      walletConnected ? 'connected' : 'guest',
      hasParticipated ? committedUsdc : 0,
    ].join('-')
  }, [walletConnected, hasParticipated, committedUsdc])

  return (
    <div className={[mpStyles.page, shellStyles.page].join(' ')}>
      <Header
        layout="hero"
        activeNav={claimOpen ? 'claim' : isMyPosition ? 'myposition' : 'crowdfund'}
        claimAvailable={claimReady}
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
        onClaim={goToClaim}
        onParticipate={participationEnabled ? openParticipateFlow : undefined}
        onConnectWallet={() => setConnectOpen(true)}
      />

      <div
        className={[
          shellStyles.experienceLayout,
          isMyPosition && shellStyles.experienceLayoutMyPosition,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div ref={graphHostRef} className={shellStyles.graphHost} data-theme="dark">
          {mountGraph && !(isMyPosition && isMobileLayout()) ? (
            <NodeSphere
              key={graphLayoutKey}
              highlightAddress={
                isGraphMyPosition
                  ? selectedAddress ?? wallet?.displayAddress
                  : selectedAddress
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
              hideNodePopover={isGraphMyPosition && inviteListOpen}
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
                    status={saleStatus.label}
                    statusDot={saleStatus.dot}
                    daysLeft={windowOpen ? '3 DAYS LEFT' : null}
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
                <div className={mpStyles.titleRow}>
                  <h1 className={mpStyles.pageTitle}>Your Position</h1>
                  {participationEnabled ? (
                    <Button
                      className={mpStyles.headerCta}
                      variant="gradient"
                      size="sm"
                      label={myPositionEmptyKind === null ? 'Commit again' : 'Participate'}
                      showIcon
                      icon="arrow-right-micro"
                      onClick={openParticipateFlow}
                    />
                  ) : null}
                </div>
                <div className={mpStyles.metaTags}>
                  {wallet ? <Tag label={wallet.displayAddress} dot="lavender" /> : null}
                  {myPositionEmptyKind !== 'disconnected' ? (
                    <>
                      <Tag label={hopLabel} dot="lavender" />
                      {hasClaimed ? <Tag label="CLAIMED" dot="active" /> : null}
                    </>
                  ) : null}
                </div>
              </div>

              {myPositionEmptyKind === 'disconnected' ? (
                <MyPositionEmptyState
                  kind="disconnected"
                  onConnectWallet={() => setConnectOpen(true)}
                />
              ) : (
                <div className={mpStyles.positionFooter}>
                  <div className={mpStyles.statsRow}>
                    <div className={mpStyles.statBlock}>
                      <p className={mpStyles.statLabel}>USDC committed</p>
                      <p className={mpStyles.statAmount}>
                        {formatUsdcCommitted(hasParticipated ? committedUsdc : 0)}
                      </p>
                    </div>

                    <div className={mpStyles.statBlock}>
                      <div className={mpStyles.statLabelRow}>
                        <p className={mpStyles.statLabel}>
                          {claimMode === 'refund' && (salePhase >= 1 || !windowOpen)
                            ? 'USDC refund'
                            : 'ARM allocation'}
                        </p>
                        <Tooltip variant="centered" content={armTooltip}>
                          <button
                            type="button"
                            className={mpStyles.infoTrigger}
                            aria-label="ARM allocation info"
                          >
                            <InformationCircleIcon className={mpStyles.infoIcon} aria-hidden />
                          </button>
                        </Tooltip>
                      </div>
                      <p className={mpStyles.statAmountAccent}>
                        {hasParticipated ? armAllocLabel : formatArmAllocation(0)}
                      </p>
                    </div>
                  </div>

                  <div className={mpStyles.barSection}>
                    <div className={mpStyles.barTrack}>
                      <div
                        className={mpStyles.barFill}
                        style={{ width: `${hasParticipated ? fillPct : 0}%` }}
                      />
                    </div>
                    <div className={mpStyles.barLabels}>
                      <span className={mpStyles.barCaption}>
                        {Math.round(hasParticipated ? fillPct : 0)}% of hop cap
                      </span>
                      <span className={mpStyles.barCaption}>
                        Cap ${capUsdc.toLocaleString()}
                        {maxOutPlan.newCommitUsdc > remainingHopUsdc
                          ? ` · Max out $${maxOutPlan.projectedCeilingUsdc.toLocaleString()}`
                          : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
            {participationEnabled ? (
              <Participate
                className={[heroStyles.enter, heroStyles.enterParticipate, shellStyles.mobileParticipateCard]
                  .filter(Boolean)
                  .join(' ')}
                imageSrc="/fleet.png"
                videoSrc="/fleet.mp4"
                onCtaClick={openParticipateFlow}
              />
            ) : null}
          </div>

          {/* Mirror POC: invites only while the commit window is open. */}
          {participationEnabled && hasParticipated ? (
            <div
              className={layerClass(myPositionPanelVisible, motionReady, myPositionPanelAnimates)}
              aria-hidden={!myPositionPanelVisible}
            >
              <InvitesCard
                variant="hero"
                slots={slots}
                allowance={inviteAllowance}
                selfWalletAddress={wallet?.address}
                onGenerateLink={generateInviteLink}
                onCopy={handleCopy}
                onRevoke={revokeSlot}
                onConfirmCreated={revealInviteInList}
                onDiscardCreated={discardDeferredInvite}
                onFlushPending={flushPendingInvites}
                onInviteOnchain={inviteOnchain}
                copiedSlotId={copiedId}
                loadingHop={loadingHop}
                onInviteListOpenChange={handleInviteListOpenChange}
                panelActive={isMyPosition}
                onViewRedeemed={(address) =>
                  startPanelTransition('crowdfund', { selectAddress: address })
                }
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={shellStyles.saleDebug} role="group" aria-label="Demo sale stage">
        <span className={shellStyles.saleDebugLabel}>Demo sale</span>
        {SALE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={shellStyles.saleDebugBtn}
            onClick={() => setSalePreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <ParticipateFlowCrowdfund
        open={participateOpen && isCrowdfund && participationEnabled && !claimOpen}
        onClose={closeParticipateFlow}
        onViewPosition={viewPositionFromParticipateFlow}
        walletConnected={walletConnected}
        onConnectWallet={connectWallet}
        onCompleteParticipation={completeParticipation}
        onApplyMaxOutPlan={applyMaxOutPlan}
        hasParticipated={hasParticipated}
        committedUsdc={committedUsdc}
        capUsdc={capUsdc}
        remainingHopUsdc={remainingHopUsdc}
        maxOutPlan={maxOutPlan}
        hopVariant={hopVariant}
        walletAddress={wallet?.address}
        walletDisplayAddress={wallet?.displayAddress}
        windowClosesLabel="14 Oct, 18:00 CET"
        slots={slots}
        inviteAllowance={inviteAllowance}
        onGenerateInviteLink={generateInviteLink}
        onRevokeSlot={revokeSlot}
        onInviteOnchainHop={inviteOnchain}
        onCopySlotLink={handleCopy}
        loadingHop={loadingHop}
        copiedSlotId={copiedId}
      />

      <ParticipateFlowModal
        open={claimOpen && claimReady}
        onClose={closeClaimFlow}
        ariaLabel="Claim your allocation"
        closeAriaLabel="Close claim flow"
        showClose={false}
      >
        <ClaimFlow
          walletConnected={walletConnected}
          walletDisplayAddress={wallet?.displayAddress}
          claimAvailable={claimReady}
          awaitingFinalize={awaitingFinalize}
          mode={claimMode}
          hasParticipated={hasParticipated}
          hasClaimed={hasClaimed}
          armAmount={Math.round(committedUsdc / 100) || 10}
          refundUsdc={committedUsdc || 1000}
          committedUsdc={committedUsdc}
          onClaim={completeClaim}
          onBackToCrowdfund={goToCrowdfund}
          onViewPosition={goToMyPosition}
          onConnectWallet={() => setConnectOpen(true)}
          onClose={closeClaimFlow}
        />
      </ParticipateFlowModal>

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
