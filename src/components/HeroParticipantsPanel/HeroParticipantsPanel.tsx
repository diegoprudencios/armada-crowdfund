import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { heroListHopColor } from '../../constants/graphHopColors'
import { Button } from '../Button'
import styles from './HeroParticipantsPanel.module.css'

export type HeroHopFilter = 'all' | 'seed' | 'hop1' | 'hop2' | 'multihop'

export type HeroParticipant = {
  address: string
  hop: 'SEED' | 'HOP-1' | 'HOP-2' | 'MULTI-HOP'
  amountUsd: number
}

const FILTERS: Array<{ id: HeroHopFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'seed', label: 'Seed' },
  { id: 'hop1', label: 'Hop 1' },
  { id: 'hop2', label: 'Hop 2' },
  { id: 'multihop', label: 'Multi-hop' },
]

function formatUsd(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function hopColor(hop: HeroParticipant['hop']) {
  return heroListHopColor(hop)
}

export interface HeroParticipantsPanelProps {
  participants: HeroParticipant[]
  selectedAddress?: string
  onSelectAddress?: (address: string | undefined) => void
  collapsedMaxRows?: number
  filter?: HeroHopFilter
  onFilterChange?: (filter: HeroHopFilter) => void
  showList?: boolean
  onShowListChange?: (open: boolean) => void
  layoutExpanded?: boolean
}

export function HeroParticipantsPanel({
  participants,
  selectedAddress,
  onSelectAddress,
  collapsedMaxRows = 3,
  filter: controlledFilter,
  onFilterChange,
  showList: controlledShowList,
  onShowListChange,
  layoutExpanded: layoutExpandedProp,
}: HeroParticipantsPanelProps) {
  const [uncontrolledShowList, setUncontrolledShowList] = useState(false)
  const showList = controlledShowList ?? uncontrolledShowList
  const [query, setQuery] = useState('')
  const [uncontrolledFilter, setUncontrolledFilter] = useState<HeroHopFilter>('all')
  const filter = controlledFilter ?? uncontrolledFilter
  const layoutExpanded = layoutExpandedProp ?? showList

  const setShowList = (open: boolean) => {
    if (controlledShowList == null) setUncontrolledShowList(open)
    onShowListChange?.(open)
  }

  const setFilter = (next: HeroHopFilter) => {
    if (controlledFilter == null) setUncontrolledFilter(next)
    onFilterChange?.(next)
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return participants.filter((p) => {
      const matchesQuery = !q || p.address.toLowerCase().includes(q)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'seed' && p.hop === 'SEED') ||
        (filter === 'hop1' && p.hop === 'HOP-1') ||
        (filter === 'hop2' && p.hop === 'HOP-2') ||
        (filter === 'multihop' && p.hop === 'MULTI-HOP')
      return matchesQuery && matchesFilter
    })
  }, [participants, query, filter])

  const isEmpty = participants.length === 0
  const noResults = !isEmpty && rows.length === 0

  return (
    <section className={[styles.panel, layoutExpanded && styles.expanded].filter(Boolean).join(' ')} aria-label="Participants">
      <div
        className={[
          styles.listShell,
          layoutExpanded ? styles.listShellOpen : styles.listShellClosed,
          showList ? styles.listAnimOpen : styles.listAnimClosed,
        ].join(' ')}
        aria-hidden={!showList}
      >
        <div className={styles.listBackdrop}>
          <div
            className={[
              styles.listInner,
              showList ? styles.listInnerVisible : styles.listInnerHidden,
            ].join(' ')}
          >
            <label className={styles.listSearch}>
              <MagnifyingGlassIcon className={styles.listSearchIcon} width={14} height={14} aria-hidden />
              <input
                className={styles.listSearchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search participant address…"
                inputMode="search"
                aria-label="Search participant address"
                tabIndex={showList ? 0 : -1}
              />
            </label>

            <div className={styles.listScroll}>
              {isEmpty ? (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>No participants yet</div>
                  <div className={styles.emptySub}>Be the first to participate.</div>
                  <div className={styles.emptyCta}>
                    <Button variant="gradient" size="md" label="Participate" showIcon icon="arrow-right-micro" />
                  </div>
                </div>
              ) : noResults ? (
                <div className={styles.empty}>
                  <div className={styles.emptyTitle}>No matches</div>
                  <div className={styles.emptySub}>Try a different address or filter.</div>
                </div>
              ) : (
                rows.map((p, idx) => {
                  const selected = p.address === selectedAddress
                  return (
                    <button
                      key={p.address}
                      type="button"
                      className={[styles.row, selected && styles.rowSelected].filter(Boolean).join(' ')}
                      onClick={() => onSelectAddress?.(selected ? undefined : p.address)}
                      aria-pressed={selected}
                      tabIndex={showList ? 0 : -1}
                    >
                      <span className={styles.rank}>{idx + 1}</span>
                      <span className={styles.addr}>{p.address}</span>
                      <span className={styles.hop}>
                        <span className={styles.dot} style={{ ['--dot' as string]: hopColor(p.hop) }} aria-hidden />
                        {p.hop}
                      </span>
                      <span className={styles.amount}>{formatUsd(p.amountUsd)}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.filters} role="tablist" aria-label="Hop filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={[styles.filterBtn, filter === f.id && styles.filterBtnActive].filter(Boolean).join(' ')}
              onClick={() => setFilter(f.id)}
              role="tab"
              aria-selected={filter === f.id}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => {
            setShowList(!showList)
          }}
          aria-expanded={showList}
        >
          {showList ? 'Hide participants' : 'Show participants'}
        </button>
      </div>
    </section>
  )
}

