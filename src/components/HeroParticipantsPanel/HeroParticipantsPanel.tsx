import { useMemo, useState } from 'react'
import styles from './HeroParticipantsPanel.module.css'

export type HeroHopFilter = 'all' | 'seed' | 'hop1' | 'hop2'

export type HeroParticipant = {
  address: string
  hop: 'SEED' | 'HOP-1' | 'HOP-2'
  amountUsd: number
}

const FILTERS: Array<{ id: HeroHopFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'seed', label: 'Seed' },
  { id: 'hop1', label: 'Hop 1' },
  { id: 'hop2', label: 'Hop 2' },
]

function formatUsd(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function hopColor(hop: HeroParticipant['hop']) {
  if (hop === 'SEED') return 'var(--semantic-color-brand-amber)'
  if (hop === 'HOP-1') return 'var(--semantic-color-brand-lavender)'
  return 'var(--semantic-color-brand-amber-dark)'
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
}: HeroParticipantsPanelProps) {
  const [uncontrolledShowList, setUncontrolledShowList] = useState(false)
  const showList = controlledShowList ?? uncontrolledShowList
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [uncontrolledFilter, setUncontrolledFilter] = useState<HeroHopFilter>('all')
  const filter = controlledFilter ?? uncontrolledFilter

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
        (filter === 'hop2' && p.hop === 'HOP-2')
      return matchesQuery && matchesFilter
    })
  }, [participants, query, filter])

  const visibleRows = showList ? rows : rows.slice(0, collapsedMaxRows)

  return (
    <section className={[styles.panel, showList && styles.expanded].filter(Boolean).join(' ')} aria-label="Participants">
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

        <div className={styles.rightControls}>
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => {
              setShowList(!showList)
            }}
            aria-expanded={showList}
          >
            {showList ? 'Hide list' : 'View list'}
          </button>

          <div className={[styles.searchWrap, searchOpen && styles.searchWrapOpen].filter(Boolean).join(' ')}>
            <button
              type="button"
              className={styles.searchBtn}
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <span className={styles.searchIcon} aria-hidden />
            </button>
            <input
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address…"
              inputMode="search"
              aria-label="Search participants"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        </div>
      </div>

      {showList && (
        <div className={[styles.list, styles.listExpanded].filter(Boolean).join(' ')}>
        {visibleRows.map((p, idx) => {
          const selected = p.address === selectedAddress
          return (
            <button
              key={p.address}
              type="button"
              className={[styles.row, selected && styles.rowSelected].filter(Boolean).join(' ')}
              onClick={() => onSelectAddress?.(selected ? undefined : p.address)}
              aria-pressed={selected}
            >
              <span className={styles.rank}>{idx + 1}</span>
              <span className={styles.addr}>{p.address}</span>
              <span className={styles.hop}>
                <span className={styles.dot} style={{ ['--dot' as any]: hopColor(p.hop) }} aria-hidden />
                {p.hop}
              </span>
              <span className={styles.amount}>{formatUsd(p.amountUsd)}</span>
            </button>
          )
        })}

        </div>
      )}
    </section>
  )
}

