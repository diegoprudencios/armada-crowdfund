// ABOUTME: My Position invites panel — collapsible list with available/total count in the header.

import { useEffect, useId, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import SlotCard, { type SlotData } from '../InviteFlow/screens/SlotCard'
import { LAPTOP_LAYOUT_MAX_WIDTH_PX } from '../../constants/viewportBreakpoints'
import { countAvailableInviteSlots } from './myPositionDemo'
import styles from './InvitesCard.module.css'

/** @deprecated Use LAPTOP_LAYOUT_MAX_WIDTH_PX */
export const INVITES_COLLAPSED_BY_DEFAULT_MAX_WIDTH_PX = LAPTOP_LAYOUT_MAX_WIDTH_PX

/** Open by default at ≥1440px; collapsed below (matches laptop layout breakpoint). */
function invitesExpandedByDefault(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia(`(min-width: ${LAPTOP_LAYOUT_MAX_WIDTH_PX}px)`).matches
}

export type InvitesCardVariant = 'default' | 'hero' | 'split'

export interface InvitesCardProps {
  slots: SlotData[]
  variant?: InvitesCardVariant
  onGenerateLink: (slotId: number) => Promise<void>
  onCopy: (slotId: number, link: string) => void
  onRevoke: (slotId: number) => void
  onInviteOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  copiedSlotId?: number | null
  loadingSlotId?: number | null
}

export function InvitesCard({
  slots,
  variant = 'default',
  onGenerateLink,
  onCopy,
  onRevoke,
  onInviteOnchain,
  copiedSlotId = null,
  loadingSlotId = null,
}: InvitesCardProps) {
  const [expanded, setExpanded] = useState(invitesExpandedByDefault)

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${LAPTOP_LAYOUT_MAX_WIDTH_PX}px)`)
    const sync = () => setExpanded(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const listId = useId()
  const available = countAvailableInviteSlots(slots)
  const total = slots.length

  const rootClass = [
    styles.root,
    variant === 'hero' && styles.rootHero,
    variant === 'split' && styles.rootSplit,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClass} aria-label="Your invites">
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} invites, ${available} of ${total} available`}
      >
        <span className={styles.title} role="heading" aria-level={2}>
          Your Invites
        </span>
        <span className={styles.headerActions}>
          <span className={styles.count} aria-hidden>
            {available} of {total}
          </span>
          <ChevronDownIcon
            className={[styles.chevron, expanded && styles.chevronExpanded]
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          />
        </span>
      </button>
      <div
        id={listId}
        className={[styles.slotList, !expanded && styles.slotListCollapsed]
          .filter(Boolean)
          .join(' ')}
      >
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            onGenerateLink={onGenerateLink}
            onCopy={onCopy}
            onRevoke={onRevoke}
            onInviteOnchain={onInviteOnchain}
            copied={copiedSlotId === slot.id}
            loading={loadingSlotId === slot.id}
          />
        ))}
      </div>
    </section>
  )
}
