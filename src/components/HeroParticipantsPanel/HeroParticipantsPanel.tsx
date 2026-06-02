import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useMemo, useState } from 'react'
import { useCrowdfundListAnimation } from '../CrowdfundLeftColumn'
import { heroListHopColor } from '../../constants/graphHopColors'
import { Button } from '../Button'
import styles from './HeroParticipantsPanel.module.css'

export type HeroHopFilter = 'all' | 'seed' | 'hop1' | 'hop2' | 'multihop'

export type HeroParticipant = {
  address: string
  hop: 'SEED' | 'HOP-1' | 'HOP-2' | 'MULTI-HOP'
  amountUsd: number
  isSelf?: boolean
}

const FILTERS: Array<{ id: HeroHopFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'seed', label: 'Seed' },
  { id: 'hop1', label: 'Hop 1' },
  { id: 'hop2', label: 'Hop 2' },
  { id: 'multihop', label: 'Multi' },
]

function formatUsd(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function hopColor(hop: HeroParticipant['hop']) {
  return heroListHopColor(hop)
}

export interface HeroParticipantListProps {
  participants: HeroParticipant[]
  selectedAddress?: string
  onSelectAddress?: (address: string | undefined) => void
  filter?: HeroHopFilter
}

export function HeroParticipantList({
  participants,
  selectedAddress,
  onSelectAddress,
  filter = 'all',
}: HeroParticipantListProps) {
  const { listOpen, listContentVisible } = useCrowdfundListAnimation()
  const [query, setQuery] = useState('')

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
    <div className={styles.listHost} aria-hidden={!listOpen}>
      <div className={styles.listBackdrop}>
        <div
          className={[
            styles.listInner,
            listContentVisible && styles.listInnerReady,
          ]
            .filter(Boolean)
            .join(' ')}
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
              tabIndex={listOpen && listContentVisible ? 0 : -1}
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
                    className={[
                      styles.row,
                      selected && styles.rowSelected,
                      p.isSelf && styles.rowSelf,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelectAddress?.(selected ? undefined : p.address)}
                    aria-pressed={selected}
                    tabIndex={listOpen && listContentVisible ? 0 : -1}
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
  )
}

export interface HeroParticipantControlsProps {
  filter?: HeroHopFilter
  onFilterChange?: (filter: HeroHopFilter) => void
}

export function HeroParticipantControls({
  filter: controlledFilter,
  onFilterChange,
}: HeroParticipantControlsProps) {
  const { listOpen, requestOpen, requestClose } = useCrowdfundListAnimation()
  const [uncontrolledFilter, setUncontrolledFilter] = useState<HeroHopFilter>('all')
  const filter = controlledFilter ?? uncontrolledFilter

  const setFilter = (next: HeroHopFilter) => {
    if (controlledFilter == null) setUncontrolledFilter(next)
    onFilterChange?.(next)
  }

  return (
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
          if (listOpen) requestClose()
          else requestOpen()
        }}
        aria-expanded={listOpen}
        aria-label={listOpen ? 'Hide participant addresses' : 'Show participant addresses'}
      >
        {listOpen ? 'Hide address' : 'Show address'}
      </button>
    </div>
  )
}
