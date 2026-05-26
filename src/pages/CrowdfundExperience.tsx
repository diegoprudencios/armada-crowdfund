import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { HeroParticipantsPanel, type HeroParticipant } from '../components/HeroParticipantsPanel'
import { Tag } from '../components/Tag/Tag'
import Tooltip from '../components/Tooltip/Tooltip'
import SlotCard from '../components/InviteFlow/screens/SlotCard'
import {
  DEMO_SLOTS,
  DEMO_WALLET,
  DEMO_WALLET_DISPLAY,
  FILL_PCT,
  formatArmAllocation,
  formatUsdcCommitted,
  GRAPH_PARTICIPANTS,
} from '../components/MyPosition/myPositionDemo'
import { NodeSphere } from './NodeSphere'
import { generateDashboardParticipants, toHeroParticipants } from '../utils/mockParticipants'
import heroStyles from './Hero.module.css'
import mpStyles from '../components/MyPosition/MyPositionHero.module.css'
import shellStyles from './CrowdfundExperience.module.css'

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

export function CrowdfundExperience({ initialView }: CrowdfundExperienceProps) {
  const scenario = useRef<{ participants: 0 | 3 | 4 | 5 | 30 | 800; seed: number } | null>(null)
  if (!scenario.current) {
    const r = Math.random()
    const participants = (r < 0.25 ? 0 : r < 0.5 ? 3 + Math.floor(Math.random() * 3) : r < 0.75 ? 30 : 800) as
      | 0
      | 3
      | 4
      | 5
      | 30
      | 800
    scenario.current = { participants, seed: Math.floor(Math.random() * 1_000_000_000) }
  }

  const [view, setView] = useState<CrowdfundView>(() => readInitialView(initialView))
  const [graphMode, setGraphMode] = useState<CrowdfundView>(() => readInitialView(initialView))
  const [panelPhase, setPanelPhase] = useState<PanelPhase>('idle')
  const [motionReady, setMotionReady] = useState(false)
  const panelTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const committedAmount = (() => {
    const p = scenario.current!.participants
    if (p === 0) return 0
    if (p <= 5) return p * 20000
    if (p === 30) return 857000
    return 1700000
  })()

  const dashRows = useMemo(
    () => generateDashboardParticipants(scenario.current!.seed, scenario.current!.participants),
    [],
  )
  const participants = useMemo(() => toHeroParticipants(dashRows) as HeroParticipant[], [dashRows])
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState<'all' | 'seed' | 'hop1' | 'hop2' | 'multihop'>('all')
  const [participantsListOpen, setParticipantsListOpen] = useState(false)
  const [holdColumnExpanded, setHoldColumnExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const participantsPanelRef = useRef<HTMLDivElement | null>(null)
  const leftStackRef = useRef<HTMLDivElement | null>(null)

  const HERO_EXPAND_MS = 380
  const isCrowdfund = view === 'crowdfund'
  const isMyPosition = view === 'myposition'
  const isGraphCrowdfund = graphMode === 'crowdfund'
  const isGraphMyPosition = graphMode === 'myposition'
  const graphParticipants =
    scenario.current!.participants === 0 ? GRAPH_PARTICIPANTS : scenario.current!.participants
  const columnExpanded = participantsListOpen || holdColumnExpanded

  useEffect(() => {
    const id = requestAnimationFrame(() => setMotionReady(true))
    return () => cancelAnimationFrame(id)
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
      setSelectedAddress(undefined)
    }

    setPanelPhase('exit')
    clearPanelTransition()

    panelTransitionTimer.current = setTimeout(() => {
      setView(next)
      syncUrl(next)
      if (next === 'myposition') setGraphMode('myposition')
      setPanelPhase('enter')

      panelTransitionTimer.current = setTimeout(() => {
        setPanelPhase('idle')
        panelTransitionTimer.current = null
      }, PANEL_ENTER_MS)
    }, PANEL_EXIT_MS + PANEL_GAP_MS)
  }

  useLayoutEffect(() => {
    const stack = leftStackRef.current
    const progressCard = stack?.firstElementChild as HTMLElement | null
    if (!progressCard) return

    const applyProgressCardHeight = () => {
      const h = Math.ceil(progressCard.getBoundingClientRect().height)
      if (h < 1) return false
      stack
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

  useLayoutEffect(() => {
    const el = leftStackRef.current
    if (!el || !isCrowdfund) return

    const applyCollapsedHeight = () => {
      el.style.minHeight = '0'
      el.style.maxHeight = 'none'
      const h = Math.ceil(el.getBoundingClientRect().height)
      el.style.minHeight = ''
      el.style.maxHeight = ''
      if (h < 1) return false
      const px = `${h}px`
      el.style.setProperty('--hero-stack-collapsed-height', px)
      el.closest<HTMLElement>('[class*="leftCorner"]')?.style.setProperty('--hero-stack-collapsed-height', px)
      return true
    }

    if (applyCollapsedHeight()) return

    const raf = requestAnimationFrame(() => {
      if (!applyCollapsedHeight()) requestAnimationFrame(applyCollapsedHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [isCrowdfund])

  useLayoutEffect(() => {
    if (!isCrowdfund) {
      setHoldColumnExpanded(false)
      return
    }
    if (participantsListOpen) {
      setHoldColumnExpanded(true)
      return
    }
    const id = window.setTimeout(() => setHoldColumnExpanded(false), HERO_EXPAND_MS)
    return () => window.clearTimeout(id)
  }, [participantsListOpen, isCrowdfund])

  useEffect(() => {
    if (!isCrowdfund || !selectedAddress) return

    const onPointerDown = (e: PointerEvent) => {
      const el = participantsPanelRef.current
      if (el && el.contains(e.target as Node)) return
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
    setSelectedAddress(undefined)
    startPanelTransition('myposition')
  }

  const goToCrowdfund = () => {
    if (isCrowdfund || panelPhase !== 'idle') return
    startPanelTransition('crowdfund')
  }

  const crowdfundPanelVisible = panelVisible(view, 'crowdfund', panelPhase)
  const myPositionPanelVisible = panelVisible(view, 'myposition', panelPhase)
  const crowdfundPanelAnimates = panelAnimates(view, 'crowdfund', panelPhase, motionReady)
  const myPositionPanelAnimates = panelAnimates(view, 'myposition', panelPhase, motionReady)

  const handleGenerateLink = async (slotId: number) => {
    setLoadingId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    setLoadingId(null)
  }

  const handleCopy = (slotId: number, link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(slotId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async () => {}
  const handleInviteOnchain = async (slotId: number) => {
    setLoadingId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    setLoadingId(null)
  }

  const crowdfundPinnedNodes = useMemo(
    () =>
      participants.map((p) => ({
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
      })),
    [participants],
  )

  return (
    <div className={[mpStyles.page, shellStyles.page].join(' ')}>
      <NodeSphere
        highlightAddress={isGraphMyPosition ? selectedAddress ?? DEMO_WALLET : selectedAddress}
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
        walletAddress={DEMO_WALLET}
        lockOnWallet={isGraphMyPosition}
        inviteGraph={isGraphMyPosition}
        interactionDisabled={isGraphCrowdfund && participantsListOpen}
        scenarioParticipants={graphParticipants}
        scenarioSeed={scenario.current!.seed}
        pinnedNodes={crowdfundPinnedNodes}
      />

      <Header
        activeNav={isMyPosition ? 'myposition' : 'crowdfund'}
        walletAddress={DEMO_WALLET_DISPLAY}
        autoHideOnScroll={false}
        className={[heroStyles.headerOverride, heroStyles.enter, heroStyles.enterHeader].join(' ')}
        onMyPosition={goToMyPosition}
        onCrowdfund={goToCrowdfund}
      />

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
          <div
            ref={leftStackRef}
            className={[heroStyles.leftStack, heroStyles.enter, heroStyles.enterProgress].join(' ')}
          >
            <Progress
              participants={`${scenario.current!.participants} PARTICIPANTS`}
              committedAmount={committedAmount}
            />
            <div ref={participantsPanelRef} className={heroStyles.participantsWrap}>
              <HeroParticipantsPanel
                participants={participants}
                selectedAddress={selectedAddress}
                onSelectAddress={setSelectedAddress}
                collapsedMaxRows={3}
                filter={filter}
                onFilterChange={setFilter}
                layoutExpanded={columnExpanded}
                showList={participantsListOpen}
                onShowListChange={(open) => {
                  setParticipantsListOpen(open)
                  if (!open) setSelectedAddress(undefined)
                }}
              />
            </div>
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
                <Tag label={DEMO_WALLET_DISPLAY} dot="lavender" />
                <Tag label="HOP-1" dot="lavender" />
              </div>
            </div>

            <div className={mpStyles.positionFooter}>
              <div className={mpStyles.statsRow}>
                <div className={mpStyles.statBlock}>
                  <p className={mpStyles.statLabel}>USDC committed</p>
                  <p className={mpStyles.statAmount}>{formatUsdcCommitted()}</p>
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
                  <p className={mpStyles.statAmountAccent}>{formatArmAllocation()}</p>
                </div>
              </div>

              <div className={mpStyles.barSection}>
                <div className={mpStyles.barTrack}>
                  <div className={mpStyles.barFill} style={{ width: `${FILL_PCT}%` }} />
                </div>
                <div className={mpStyles.barLabels}>
                  <span className={mpStyles.barCaption}>{FILL_PCT}% of cap</span>
                  <span className={mpStyles.barCaption}>Cap $10,000</span>
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
            className={[heroStyles.enter, heroStyles.enterParticipate].join(' ')}
            imageSrc="/fleet.png"
            videoSrc="/fleet.mp4"
          />
        </div>

        <div
          className={layerClass(myPositionPanelVisible, motionReady, myPositionPanelAnimates)}
          aria-hidden={!myPositionPanelVisible}
        >
          <section className={mpStyles.inviteCard} aria-label="Your invites">
            <h2 className={mpStyles.inviteTitle}>Your Invites</h2>
            <div className={mpStyles.slotList}>
              {DEMO_SLOTS.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  onGenerateLink={handleGenerateLink}
                  onCopy={handleCopy}
                  onRevoke={handleRevoke}
                  onInviteOnchain={handleInviteOnchain}
                  copied={copiedId === slot.id}
                  loading={loadingId === slot.id}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
