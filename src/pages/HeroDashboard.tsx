import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { ParticipantsTable } from '../components/ParticipantsTable'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'
import { Tag } from '../components/Tag'
import { NodeSphere } from './NodeSphere'
import { generateDashboardParticipants, generateParticipantsTableRows } from '../utils/mockParticipants'
import styles from './HeroDashboard.module.css'

export function HeroDashboard() {
  const scenario = useMemo(() => {
    const r = Math.random()
    const participants = (r < 0.25 ? 0 : r < 0.5 ? 3 + Math.floor(Math.random() * 3) : r < 0.75 ? 30 : 800) as
      | 0
      | 3
      | 4
      | 5
      | 30
      | 800
    const seed = Math.floor(Math.random() * 1_000_000_000)
    const committedAmount = participants === 0 ? 0 : participants <= 5 ? participants * 20000 : participants === 30 ? 857000 : 1700000
    return { participants, seed, committedAmount }
  }, [])

  const graphParticipants = useMemo(
    () => generateDashboardParticipants(scenario.seed, scenario.participants),
    [scenario.seed, scenario.participants],
  )

  const tableRows = useMemo(
    () => generateParticipantsTableRows(scenario.seed, scenario.participants),
    [scenario.seed, scenario.participants],
  )

  const [filter, setFilter] = useState<'all' | 'hop0' | 'hop1' | 'hop2' | 'multihop'>('all')
  const [query, setQuery] = useState('')
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(undefined)

  return (
    <div className={styles.page}>
      <Header activeNav="crowdfund" className={styles.headerDashboard} autoHideOnScroll={false} />

      <main className={styles.main}>
        <header className={styles.headline}>
          <h1 className={styles.title}>Armada Crowdfund</h1>
          <div className={styles.tags}>
            <Tag label="ACTIVE" dot="active" />
            <Tag label="3 DAYS LEFT" />
            <Tag label={`${scenario.participants} PARTICIPANTS`} />
          </div>
        </header>

        <section className={styles.topRow} aria-label="Crowdfund summary">
          <Progress
            hideStatus
            className={styles.progressMain}
            participants={`${scenario.participants} PARTICIPANTS`}
            committedAmount={scenario.committedAmount}
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
          <div className={styles.sphereFrame} data-theme="dark">
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
                      : filter === 'multihop'
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
