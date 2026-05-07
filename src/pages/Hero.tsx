import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { HeroParticipantsPanel, HeroParticipant } from '../components/HeroParticipantsPanel'
import { NodeSphere } from './NodeSphere'
import { generateDashboardParticipants, toHeroParticipants } from '../utils/mockParticipants'
import styles from './Hero.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function Hero() {
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
  const [filter, setFilter] = useState<'all' | 'seed' | 'hop1' | 'hop2'>('all')
  const [participantsListOpen, setParticipantsListOpen] = useState(false)
  const participantsPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selectedAddress) return

    const onPointerDown = (e: PointerEvent) => {
      const el = participantsPanelRef.current
      if (el && el.contains(e.target as Node)) return
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
        filterKind={filter === 'seed' ? 'Hop 0' : filter === 'hop1' ? 'Hop 1' : filter === 'hop2' ? 'Hop 2' : undefined}
        interactionDisabled={participantsListOpen}
        scenarioParticipants={scenario.current.participants}
        scenarioSeed={scenario.current.seed}
        pinnedNodes={participants.map((p) => ({
          kind: p.hop === 'SEED' ? 'Hop 0' : p.hop === 'HOP-1' ? 'Hop 1' : 'Hop 2',
          address: p.address,
          committed: `$${p.amountUsd.toLocaleString()} committed`,
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
            participants={`${scenario.current.participants} PARTICIPANTS`}
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

