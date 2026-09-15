// ABOUTME: My Position invites panel — collapsible list with available/total count in the header.

import { useEffect, useId, useMemo, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { INVITE_METHOD_PICKER_UX } from '../../constants/inviteUx'
import SlotCard, { type SlotData } from '../InviteFlow/screens/SlotCard'
import { InviteFocusChrome, useInviteSlotFocus } from '../InviteFlow/useInviteSlotFocus'
import { LAPTOP_LAYOUT_MAX_WIDTH_PX, MOBILE_LAYOUT_MAX_WIDTH_PX } from '../../constants/viewportBreakpoints'
import { countAvailableInviteSlots } from './myPositionDemo'
import styles from './InvitesCard.module.css'

/** @deprecated Use LAPTOP_LAYOUT_MAX_WIDTH_PX */
export const INVITES_COLLAPSED_BY_DEFAULT_MAX_WIDTH_PX = LAPTOP_LAYOUT_MAX_WIDTH_PX

/** Open by default at ≥1440px; collapsed below (matches laptop layout breakpoint). */
function invitesExpandedByDefault(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia(`(min-width: ${LAPTOP_LAYOUT_MAX_WIDTH_PX}px)`).matches
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`).matches
}

/** True when every slot was spent as a self-invite (max-out), not shared with friends. */
function isSelfFillExhausted(slots: SlotData[], selfWalletAddress?: string): boolean {
  if (!selfWalletAddress || slots.length === 0) return false
  const self = selfWalletAddress.toLowerCase()
  return slots.every(
    (slot) =>
      slot.status === 'redeemed' &&
      typeof slot.redeemedBy === 'string' &&
      slot.redeemedBy.toLowerCase() === self,
  )
}

export type InvitesCardVariant = 'default' | 'hero' | 'split'

export interface InvitesCardProps {
  slots: SlotData[]
  variant?: InvitesCardVariant
  /** Connected wallet — used to detect self-fill max-out exhaustion. */
  selfWalletAddress?: string
  onGenerateLink: (slotId: number) => Promise<void>
  onCopy: (slotId: number, link: string) => void
  onRevoke: (slotId: number) => void
  onInviteOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  copiedSlotId?: number | null
  loadingSlotId?: number | null
  /** Open crowdfund with the redeemed invitee wallet selected. */
  onViewRedeemed?: (address: string) => void
}

export function InvitesCard({
  slots,
  variant = 'default',
  selfWalletAddress,
  onGenerateLink,
  onCopy,
  onRevoke,
  onInviteOnchain,
  copiedSlotId = null,
  loadingSlotId = null,
  onViewRedeemed,
}: InvitesCardProps) {
  const [expanded, setExpanded] = useState(() => {
    if (variant === 'hero' && isMobileViewport()) return true
    return invitesExpandedByDefault()
  })
  const focusApi = useInviteSlotFocus()

  useEffect(() => {
    if (variant === 'hero') {
      const mobileMq = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`)
      const desktopMq = window.matchMedia(`(min-width: ${LAPTOP_LAYOUT_MAX_WIDTH_PX}px)`)
      const sync = () => {
        if (mobileMq.matches) {
          setExpanded(true)
        } else {
          setExpanded(desktopMq.matches)
        }
      }
      sync()
      mobileMq.addEventListener('change', sync)
      desktopMq.addEventListener('change', sync)
      return () => {
        mobileMq.removeEventListener('change', sync)
        desktopMq.removeEventListener('change', sync)
      }
    }

    const mq = window.matchMedia(`(min-width: ${LAPTOP_LAYOUT_MAX_WIDTH_PX}px)`)
    const sync = () => setExpanded(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [variant])

  const listId = useId()
  const available = countAvailableInviteSlots(slots)
  const total = slots.length
  const selfFillExhausted = useMemo(
    () => isSelfFillExhausted(slots, selfWalletAddress),
    [slots, selfWalletAddress],
  )
  const isActionView = INVITE_METHOD_PICKER_UX && focusApi.view === 'action'
  const panelOpen = expanded || isActionView

  const rootClass = [
    styles.root,
    variant === 'hero' && styles.rootHero,
    variant === 'split' && styles.rootSplit,
    isActionView && styles.rootAction,
  ]
    .filter(Boolean)
    .join(' ')

  const slotList = selfFillExhausted ? (
    <div className={styles.emptyState} role="status">
      <p className={styles.emptyTitle}>No invites left</p>
      <p className={styles.emptyBody}>
        You used all {total} invite slot{total === 1 ? '' : 's'} on yourself to max out your
        commit. Those slots are no longer available to whitelist friends.
      </p>
    </div>
  ) : (
    <div className={styles.slotListInner}>
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
          onInviteClick={INVITE_METHOD_PICKER_UX ? focusApi.openPicker : undefined}
          onInviteButtonRef={INVITE_METHOD_PICKER_UX ? focusApi.registerInviteButton : undefined}
          invitePickerOpen={focusApi.pickerSlotId === slot.id}
          onViewRedeemed={onViewRedeemed}
        />
      ))}
    </div>
  )

  return (
    <section
      className={rootClass}
      aria-label="Whitelist a friend"
      data-invite-surface=""
    >
      {!isActionView && (
        <button
          type="button"
          className={styles.header}
          onClick={() => {
            if (variant === 'hero' && isMobileViewport()) return
            setExpanded((open) => !open)
          }}
          aria-expanded={panelOpen}
          aria-controls={listId}
          aria-label={`${panelOpen ? 'Collapse' : 'Expand'} whitelist a friend, ${available} of ${total} available`}
        >
          <span className={styles.title} role="heading" aria-level={2}>
            Whitelist a friend
          </span>
          <span className={styles.headerActions}>
            <span className={styles.count} aria-hidden>
              {available} of {total}
            </span>
            <ChevronDownIcon
              className={[styles.chevron, panelOpen && styles.chevronExpanded]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
          </span>
        </button>
      )}
      <div
        id={listId}
        className={[
          styles.slotList,
          !panelOpen && styles.slotListCollapsed,
          isActionView && styles.slotListAction,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {selfFillExhausted ? (
          slotList
        ) : INVITE_METHOD_PICKER_UX ? (
          <InviteFocusChrome
            focusApi={focusApi}
            loadingSlotId={loadingSlotId}
            onGenerateLink={onGenerateLink}
            onInviteOnchain={onInviteOnchain}
            list={slotList}
          />
        ) : (
          slotList
        )}
      </div>
    </section>
  )
}
