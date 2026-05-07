import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { ParticipantsTable } from '../components/ParticipantsTable'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'
import { Tag } from '../components/Tag'
import { NodeSphere } from './NodeSphere'
import styles from './HeroDashboard.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function HeroDashboard() {
  const participants = useMemo(
    () => [
      { address: '0x4f2e...8a1c', hop: 'Hop 0' as const, amountUsd: 15000 },
      { address: '0x7b9d...3f42', hop: 'Hop 0' as const, amountUsd: 12400 },
      { address: '0xa1c8...9e24', hop: 'Hop 1' as const, amountUsd: 4000 },
      { address: '0x2d5f...7b18', hop: 'Hop 0' as const, amountUsd: 15000 },
      { address: '0x9e3a...4c67', hop: 'Hop 1' as const, amountUsd: 3200 },
      { address: '0x6c1b...2d89', hop: 'Hop 2' as const, amountUsd: 1000 },
      { address: '0x3f7e...5a31', hop: 'Hop 1' as const, amountUsd: 4000 },
      { address: '0x1b44...0d7a', hop: 'Hop 0' as const, amountUsd: 8200 },
      { address: '0x8d10...c3e9', hop: 'Hop 2' as const, amountUsd: 2600 },
      { address: '0x0aa9...e11c', hop: 'Hop 1' as const, amountUsd: 5100 },
      { address: '0x55f2...9a04', hop: 'Hop 0' as const, amountUsd: 19800 },
      { address: '0x3d0c...f2b1', hop: 'Hop 2' as const, amountUsd: 900 },
      { address: '0x91e7...aa62', hop: 'Hop 1' as const, amountUsd: 7400 },
      { address: '0x2fe1...4c90', hop: 'Hop 0' as const, amountUsd: 11200 },
      { address: '0x6a0b...1f2e', hop: 'Hop 2' as const, amountUsd: 3200 },
      { address: '0xcf20...7b33', hop: 'Hop 1' as const, amountUsd: 4100 },
      { address: '0x74d1...0a8e', hop: 'Hop 0' as const, amountUsd: 5600 },
      { address: '0x19c0...dd71', hop: 'Hop 2' as const, amountUsd: 1500 },
      { address: '0xb4a1...77c0', hop: 'Hop 1' as const, amountUsd: 8900 },
      { address: '0x0d2e...a19f', hop: 'Hop 0' as const, amountUsd: 6200 },
      { address: '0x92ff...1c3a', hop: 'Hop 2' as const, amountUsd: 2100 },
      { address: '0x6f10...0b2d', hop: 'Hop 1' as const, amountUsd: 3600 },
      { address: '0x3aa0...9b11', hop: 'Hop 0' as const, amountUsd: 14100 },
      { address: '0x77c9...e0f4', hop: 'Hop 2' as const, amountUsd: 1700 },
      { address: '0xa0b1...2c9d', hop: 'Hop 1' as const, amountUsd: 2750 },
      { address: '0x5d92...aa03', hop: 'Hop 0' as const, amountUsd: 4600 },
      { address: '0xe21a...19d0', hop: 'Hop 2' as const, amountUsd: 980 },
      { address: '0x9c10...f1aa', hop: 'Hop 1' as const, amountUsd: 5300 },
      { address: '0x18d4...0c7e', hop: 'Hop 0' as const, amountUsd: 10250 },
      { address: '0x2a70...7e10', hop: 'Hop 2' as const, amountUsd: 3400 },
    ],
    [],
  )

  const [filter, setFilter] = useState<'all' | 'hop0' | 'hop1' | 'hop2'>('all')
  const [query, setQuery] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)

  return (
    <div className={styles.page}>
      <Header
        navItems={[...NAV_ITEMS]}
        ctaLabel="Participate"
        className={styles.headerDashboard}
        autoHideOnScroll={false}
      />

      <main className={styles.main}>
        <header className={styles.headline}>
          <h1 className={styles.title}>Armada Crowdfund</h1>
          <div className={styles.tags}>
            <Tag label="ACTIVE" dot="active" />
            <Tag label="3 DAYS LEFT" />
            <Tag label="96 PARTICIPANTS" />
          </div>
        </header>

        <section className={styles.topRow} aria-label="Crowdfund summary">
          <Progress hideStatus className={styles.progressMain} />
          <div className={styles.participateWrap}>
            <Participate
              className={styles.participateDashboard}
              headingClassName={styles.participateDashboardHeading}
              ctaClassName={styles.participateDashboardCta}
              buttonFullWidth={false}
              imageSrc="/fleet.png"
              videoSrc="/fleet.mp4"
            />
          </div>
        </section>

        <section className={styles.sphereSection} aria-label="Network">
          <div className={styles.sphereFrame}>
            <NodeSphere
              highlightAddress={selectedAddress}
              filterKind={filter === 'hop0' ? 'Hop 0' : filter === 'hop1' ? 'Hop 1' : filter === 'hop2' ? 'Hop 2' : undefined}
              interactionDisabled={false}
              pinnedNodes={participants.map((p) => ({
                kind: p.hop,
                address: p.address,
                committed: `$${p.amountUsd.toLocaleString()} committed`,
              }))}
            />
          </div>
        </section>

        <ParticipantsTable
          filter={filter}
          onFilterChange={setFilter}
          query={query}
          onQueryChange={setQuery}
        />
      </main>
    </div>
  )
}
