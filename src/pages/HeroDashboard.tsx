import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { ParticipantsTable } from '../components/ParticipantsTable'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'
import { Tag } from '../components/Tag'
import { NodeSphere } from './NodeSphere'
import {
  generateCrowdfund,
  toDashboardParticipants,
  toParticipantsTableRows,
} from '../utils/mockParticipants'
import styles from './HeroDashboard.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function HeroDashboard() {
  const scenario = useMemo(() => {
    // Scenario is active by default. Append `?state=empty` to the URL to see
    // the pre-launch (no participants) state instead.
    const empty = new URLSearchParams(window.location.search).get('state') === 'empty'
    const seed = Math.floor(Math.random() * 1_000_000_000)
    const crowdfund = empty ? null : generateCrowdfund(seed)
    const participants = crowdfund ? crowdfund.participants.length : 0
    const uniqueWallets = crowdfund
      ? new Set(crowdfund.participants.map((p) => p.address)).size
      : 0
    return { seed, crowdfund, participants, uniqueWallets }
  }, [])

  const graphParticipants = useMemo(
    () => (scenario.crowdfund ? toDashboardParticipants(scenario.crowdfund) : []),
    [scenario.crowdfund],
  )

  const tableRows = useMemo(
    () => (scenario.crowdfund ? toParticipantsTableRows(scenario.crowdfund) : []),
    [scenario.crowdfund],
  )

  const [filter, setFilter] = useState<'all' | 'hop0' | 'hop1' | 'hop2' | 'multi'>('all')
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
            <Tag label={`${scenario.uniqueWallets} PARTICIPANTS`} />
          </div>
        </header>

        <section className={styles.topRow} aria-label="Crowdfund summary">
          <Progress
            hideStatus
            className={styles.progressMain}
            participants={`${scenario.uniqueWallets} PARTICIPANTS`}
            committedAmount={scenario.crowdfund?.totalCommitted ?? 0}
          />
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
              onSelectAddress={setSelectedAddress}
              filterKind={
                filter === 'hop0'
                  ? 'Hop 0'
                  : filter === 'hop1'
                  ? 'Hop 1'
                  : filter === 'hop2'
                  ? 'Hop 2'
                  : filter === 'multi'
                  ? 'Multi-hop'
                  : undefined
              }
              interactionDisabled={false}
              scenarioParticipants={scenario.participants}
              scenarioSeed={scenario.seed}
              pinnedNodes={graphParticipants.map((p) => ({
                kind: p.hop,
                address: p.address,
                committed: `$${p.amountUsd.toLocaleString()} committed`,
                multiHop: p.multiHop,
                inviter: p.inviter,
              }))}
            />
          </div>
        </section>

        <ParticipantsTable
          filter={filter}
          onFilterChange={setFilter}
          query={query}
          onQueryChange={setQuery}
          rows={tableRows}
        />
      </main>
    </div>
  )
}
