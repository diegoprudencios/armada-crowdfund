import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '../Button'
import {
  InviteHopFocusChrome,
  useInviteHopFocus,
} from '../InviteFlow/useInviteSlotFocus'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import { HopAvailableRow } from '../MyPosition/InvitesCard'
import inviteCardStyles from '../MyPosition/InvitesCard.module.css'
import {
  availableForHop,
  hopsWithAllowance,
  type InviteAllowance,
  type InviteeHop,
} from '../MyPosition/inviteModel'
import inviteStyles from '../InviteFlow/screens/InviteSlots.module.css'
import styles from './ParticipateFlowInviteSlots.module.css'

export interface ParticipateFlowInviteSlotsProps {
  /** Issued invites (pending / waiting / joined / closed). Empty slots are not rows. */
  slots: SlotData[]
  allowance: InviteAllowance
  onGenerateLink: (
    hop: InviteeHop,
  ) => Promise<{ id: number; link: string; expiresAt: Date } | void>
  onCopy: (inviteId: number, link: string) => void
  onRevoke: (inviteId: number) => void | Promise<void>
  onInviteOnchain: (
    hop: InviteeHop,
    address: string,
    ensName?: string,
  ) => Promise<{ id: number; address: string; ensName?: string } | void>
  onDoItLater?: () => void
  copiedId?: number | null
  loadingHop?: InviteeHop | null
}

export function ParticipateFlowInviteSlots({
  slots,
  allowance,
  onGenerateLink,
  onCopy,
  onRevoke,
  onInviteOnchain,
  onDoItLater,
  copiedId = null,
  loadingHop = null,
}: ParticipateFlowInviteSlotsProps) {
  const focusApi = useInviteHopFocus()
  const [rollFromByHop, setRollFromByHop] = useState<
    Partial<Record<InviteeHop, number>>
  >({})
  const actionAvailableSnapshotRef = useRef<Partial<
    Record<InviteeHop, number>
  > | null>(null)

  const hopRows = useMemo(() => hopsWithAllowance(allowance), [allowance])
  const isEmpty = hopRows.length === 0
  const isActionView = focusApi.view === 'action'

  useEffect(() => {
    if (isActionView) {
      if (actionAvailableSnapshotRef.current == null) {
        const snap: Partial<Record<InviteeHop, number>> = {}
        for (const hop of hopRows) {
          snap[hop] = availableForHop(slots, allowance, hop)
        }
        actionAvailableSnapshotRef.current = snap
      }
      return
    }

    const snap = actionAvailableSnapshotRef.current
    if (!snap) return
    actionAvailableSnapshotRef.current = null
    const nextRoll: Partial<Record<InviteeHop, number>> = {}
    for (const hop of hopRows) {
      const from = snap[hop]
      const to = availableForHop(slots, allowance, hop)
      if (from != null && from > to) nextRoll[hop] = from
    }
    if (Object.keys(nextRoll).length > 0) setRollFromByHop(nextRoll)
  }, [isActionView, hopRows, slots, allowance])

  const hopList = (
    <div className={inviteCardStyles.hopList} role="list">
      {hopRows.map((hop) => {
        const available = availableForHop(slots, allowance, hop)
        return (
          <HopAvailableRow
            key={hop}
            hop={hop}
            available={available}
            rollFrom={rollFromByHop[hop]}
            pickerOpen={focusApi.pickerHop === hop}
            onInviteClick={(h, anchor) => focusApi.openPicker(h, anchor)}
            inviteButtonRef={(el) => focusApi.registerInviteButton(hop, el)}
            onRollComplete={() =>
              setRollFromByHop((prev) => {
                if (prev[hop] == null) return prev
                const next = { ...prev }
                delete next[hop]
                return next
              })
            }
          />
        )
      })}
    </div>
  )

  const listFrame = (
    <div className={inviteStyles.listFrame}>
      {!isActionView && (
        <div className={inviteStyles.header}>
          <h2 className={inviteStyles.title}>Whitelist a friend</h2>
          {!isEmpty && (
            <p className={inviteStyles.subtitle}>
              We need more sailors like you to join the fleet.
              <br />
              Share a link or send an onchain invite to a specific address.
            </p>
          )}
        </div>
      )}
      <div className={styles.scroll}>
        {isEmpty ? (
          <div className={styles.empty} role="status">
            <p className={styles.emptyText}>
              You have no invite slots available at this hop.
            </p>
          </div>
        ) : (
          hopList
        )}
      </div>
    </div>
  )

  return (
    <div className={styles.layout}>
      <div
        className={[inviteStyles.shell, styles.shell].join(' ')}
        data-flow-shell
        data-invite-surface=""
      >
        {!isEmpty ? (
          <InviteHopFocusChrome
            focusApi={focusApi}
            loadingHop={loadingHop}
            onGenerateLink={onGenerateLink}
            onInviteOnchain={onInviteOnchain}
            onCopy={onCopy}
            onRevoke={onRevoke}
            copiedInviteId={copiedId}
            list={listFrame}
          />
        ) : (
          listFrame
        )}
      </div>

      {onDoItLater && focusApi.view === 'list' && (
        <div className={styles.footer}>
          <Button
            variant="ghost"
            size="md"
            label="Do it later"
            showIcon={false}
            onClick={onDoItLater}
          />
        </div>
      )}
    </div>
  )
}
