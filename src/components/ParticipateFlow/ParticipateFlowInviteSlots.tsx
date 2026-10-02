import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Button } from '../Button'
import { FlowChrome } from '../ParticipateFlow/FlowChrome'
import {
  InviteHopFocusChrome,
  useInviteHopFocus,
} from '../InviteFlow/useInviteSlotFocus'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import { HopAvailableRow } from '../MyPosition/InvitesCard'
import inviteCardStyles from '../MyPosition/InvitesCard.module.css'
import {
  availableForHop,
  formatInviteeHop,
  hopsWithAllowance,
  type InviteAllowance,
  type InviteeHop,
} from '../MyPosition/inviteModel'
import { useIsMobileLayout } from '../../hooks/useIsMobileLayout'
import inviteStyles from '../InviteFlow/screens/InviteSlots.module.css'
import styles from './ParticipateFlowInviteSlots.module.css'

export interface ParticipateFlowInviteSlotsProps {
  /** Issued invites (pending / waiting / joined / closed). Empty slots are not rows. */
  slots: SlotData[]
  allowance: InviteAllowance
  /** Connected wallet — self-invite CTA when address matches. */
  selfWalletAddress?: string
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
  /** FlowChrome back — returns to the previous participate step (usually confirmation). */
  onBack?: () => void
  /** FlowChrome close — dismisses the participate invite step. */
  onClose?: () => void
  /** Reveal a just-created invite in the sent list (Done). */
  onConfirmCreated?: (inviteId: number) => void
  /** Free the slot if the create confirmation is abandoned / discarded. */
  onDiscardCreated?: (inviteId: number) => void
  copiedId?: number | null
  loadingHop?: InviteeHop | null
}

function whitelistSubtitle(
  slots: SlotData[],
  allowance: InviteAllowance,
  hopRows: InviteeHop[],
): string {
  const availableHops = hopRows.filter(
    (hop) => availableForHop(slots, allowance, hop) > 0,
  )
  const total = availableHops.reduce(
    (sum, hop) => sum + availableForHop(slots, allowance, hop),
    0,
  )
  if (total <= 0) {
    return 'You have no invites left to send right now.'
  }
  const countLabel = total === 1 ? '1 invite left' : `${total} invites left`
  if (availableHops.length === 1) {
    const hop = availableHops[0]
    return `You have ${countLabel} for ${formatInviteeHop(hop!)}. Share a link (no gas) or whitelist an address onchain so a friend can join.`
  }
  return `You have ${countLabel}. Share a link (no gas) or whitelist an address onchain so a friend can join the fleet.`
}

export function ParticipateFlowInviteSlots({
  slots,
  allowance,
  selfWalletAddress,
  onGenerateLink,
  onCopy,
  onRevoke,
  onInviteOnchain,
  onDoItLater,
  onBack,
  onClose,
  onConfirmCreated,
  onDiscardCreated,
  copiedId = null,
  loadingHop = null,
}: ParticipateFlowInviteSlotsProps) {
  const isMobile = useIsMobileLayout()
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
  /** Mobile keeps the hop list under the action sheet — do not swap the chrome. */
  const isInPlaceAction = isActionView && !isMobile
  const subtitle = useMemo(
    () => whitelistSubtitle(slots, allowance, hopRows),
    [slots, allowance, hopRows],
  )

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

  const listBody = (
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
  )

  return (
    <div className={styles.layout}>
      <div
        className={[inviteStyles.shell, styles.shell].join(' ')}
        data-flow-shell
        data-invite-surface=""
      >
        {/* Chrome stays outside the list↔action crossfade so back/close never drop out. */}
        {!isInPlaceAction ? (
          <div className={styles.chromeBlock}>
            <FlowChrome
              title="Whitelist a friend"
              titleId="whitelist-friend-title"
              onBack={onBack}
              onClose={onClose}
              closeAriaLabel="Close invite flow"
              backAriaLabel="Back to confirmation"
            />
            {!isEmpty ? (
              <p className={styles.subtitle}>{subtitle}</p>
            ) : null}
          </div>
        ) : null}

        {!isEmpty ? (
          <InviteHopFocusChrome
            focusApi={focusApi}
            loadingHop={loadingHop}
            onGenerateLink={onGenerateLink}
            onInviteOnchain={onInviteOnchain}
            onCopy={onCopy}
            onRevoke={onRevoke}
            onConfirmCreated={onConfirmCreated}
            onDiscardCreated={onDiscardCreated}
            selfWalletAddress={selfWalletAddress}
            existingInvites={slots}
            copiedInviteId={copiedId}
            list={listBody}
          />
        ) : (
          listBody
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
