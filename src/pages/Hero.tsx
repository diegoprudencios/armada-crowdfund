import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { HeroParticipantsPanel, HeroParticipant } from '../components/HeroParticipantsPanel'
import { NodeSphere } from './NodeSphere'
import styles from './Hero.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function Hero() {
  const participants: HeroParticipant[] = [
    { address: '0x4f2e...8a1c', hop: 'SEED', amountUsd: 15000 },
    { address: '0x7b9d...3f42', hop: 'SEED', amountUsd: 12400 },
    { address: '0xa1c8...9e24', hop: 'HOP-1', amountUsd: 4000 },
    { address: '0x2d5f...7b18', hop: 'SEED', amountUsd: 15000 },
    { address: '0x9e3a...4c67', hop: 'HOP-1', amountUsd: 3200 },
    { address: '0x6c1b...2d89', hop: 'HOP-2', amountUsd: 1000 },
    { address: '0x3f7e...5a31', hop: 'HOP-1', amountUsd: 4000 },
    { address: '0x1b44...0d7a', hop: 'SEED', amountUsd: 8200 },
    { address: '0x8d10...c3e9', hop: 'HOP-2', amountUsd: 2600 },
    { address: '0x0aa9...e11c', hop: 'HOP-1', amountUsd: 5100 },
    { address: '0x55f2...9a04', hop: 'SEED', amountUsd: 19800 },
    { address: '0x3d0c...f2b1', hop: 'HOP-2', amountUsd: 900 },
    { address: '0x91e7...aa62', hop: 'HOP-1', amountUsd: 7400 },
    { address: '0x2fe1...4c90', hop: 'SEED', amountUsd: 11200 },
    { address: '0x6a0b...1f2e', hop: 'HOP-2', amountUsd: 3200 },
    { address: '0xcf20...7b33', hop: 'HOP-1', amountUsd: 4100 },
    { address: '0x74d1...0a8e', hop: 'SEED', amountUsd: 5600 },
    { address: '0x19c0...dd71', hop: 'HOP-2', amountUsd: 1500 },
    { address: '0xb4a1...77c0', hop: 'HOP-1', amountUsd: 8900 },
    { address: '0x0d2e...a19f', hop: 'SEED', amountUsd: 6200 },
    { address: '0x92ff...1c3a', hop: 'HOP-2', amountUsd: 2100 },
    { address: '0x6f10...0b2d', hop: 'HOP-1', amountUsd: 3600 },
    { address: '0x3aa0...9b11', hop: 'SEED', amountUsd: 14100 },
    { address: '0x77c9...e0f4', hop: 'HOP-2', amountUsd: 1700 },
    { address: '0xa0b1...2c9d', hop: 'HOP-1', amountUsd: 2750 },
    { address: '0x5d92...aa03', hop: 'SEED', amountUsd: 4600 },
    { address: '0xe21a...19d0', hop: 'HOP-2', amountUsd: 980 },
    { address: '0x9c10...f1aa', hop: 'HOP-1', amountUsd: 5300 },
    { address: '0x18d4...0c7e', hop: 'SEED', amountUsd: 10250 },
    { address: '0x2a70...7e10', hop: 'HOP-2', amountUsd: 3400 },
  ]

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
        filterKind={filter === 'seed' ? 'Hop 0' : filter === 'hop1' ? 'Hop 1' : filter === 'hop2' ? 'Hop 2' : undefined}
        interactionDisabled={participantsListOpen}
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
          <Progress />
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

