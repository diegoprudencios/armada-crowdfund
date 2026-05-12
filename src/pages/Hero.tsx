import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { HeroParticipantsPanel, HeroParticipant } from '../components/HeroParticipantsPanel'
import { NodeSphere } from './NodeSphere'
import {
  generateCrowdfund,
  toDashboardParticipants,
  toHeroParticipants,
} from '../utils/mockParticipants'
import styles from './Hero.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function Hero() {
  const scenario = useRef<{ seed: number; crowdfund: ReturnType<typeof generateCrowdfund> | null } | null>(null)
  if (!scenario.current) {
    // Scenario is active by default. Append `?state=empty` to the URL to see
    // the pre-launch (no participants) state instead.
    const empty = new URLSearchParams(window.location.search).get('state') === 'empty'
    const seed = Math.floor(Math.random() * 1_000_000_000)
    scenario.current = { seed, crowdfund: empty ? null : generateCrowdfund(seed) }
  }

  const dashRows = useMemo(
    () => (scenario.current!.crowdfund ? toDashboardParticipants(scenario.current!.crowdfund) : []),
    [],
  )
  const participants = useMemo(() => toHeroParticipants(dashRows) as HeroParticipant[], [dashRows])
  const uniqueWallets = dashRows.length
  const committedAmount = scenario.current.crowdfund?.totalCommitted ?? 0

  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState<'all' | 'seed' | 'hop1' | 'hop2' | 'multi'>('all')
  const [participantsListOpen, setParticipantsListOpen] = useState(false)
  const participantsPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedAddress) return

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      const el = participantsPanelRef.current
      if (el && target && el.contains(target)) return
      // The sphere has its own click/drag selection logic; pointerdowns on
      // its canvas should not be treated as "outside" dismiss gestures.
      if (target?.tagName === 'CANVAS') return
      setSelectedAddress(undefined)
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [selectedAddress])

  return (
    <div className={styles.page}>
      <NodeSphere
        highlightAddress={selectedAddress}
        onSelectAddress={setSelectedAddress}
        filterKind={
          filter === 'seed'
            ? 'Hop 0'
            : filter === 'hop1'
            ? 'Hop 1'
            : filter === 'hop2'
            ? 'Hop 2'
            : filter === 'multi'
            ? 'Multi-hop'
            : undefined
        }
        interactionDisabled={participantsListOpen}
        scenarioParticipants={uniqueWallets}
        scenarioSeed={scenario.current.seed}
        pinnedNodes={dashRows.map((p) => ({
          kind: p.hop,
          address: p.address,
          committed: `$${p.amountUsd.toLocaleString()} committed`,
          multiHop: p.multiHop,
          inviter: p.inviter,
        }))}
      />

      <Header
        navItems={[...NAV_ITEMS]}
        ctaLabel="Participate"
        className={[styles.headerOverride, styles.enter, styles.enterHeader].join(' ')}
      />

      <div className={[styles.leftCorner, participantsListOpen && styles.leftCornerExpanded].filter(Boolean).join(' ')}>
        <div className={[styles.leftStack, styles.enter, styles.enterProgress].join(' ')}>
          <Progress
            participants={`${uniqueWallets} PARTICIPANTS`}
            committedAmount={committedAmount}
          />
          <div ref={participantsPanelRef} className={styles.participantsWrap}>
            <HeroParticipantsPanel
              participants={participants}
              selectedAddress={selectedAddress}
              onSelectAddress={setSelectedAddress}
              collapsedMaxRows={3}
              filter={filter}
              onFilterChange={setFilter}
              showList={participantsListOpen}
              onShowListChange={(open) => {
                setParticipantsListOpen(open)
                if (!open) setSelectedAddress(undefined)
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.rightCorner}>
        <Participate
          className={[styles.enter, styles.enterParticipate].join(' ')}
          imageSrc="/fleet.png"
          videoSrc="/fleet.mp4"
        />
      </div>
    </div>
  )
}

