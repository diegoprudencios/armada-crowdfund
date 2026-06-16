import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './SlotCard.module.css'
import { Button } from '../../Button'
import { Tag } from '../../Tag'
import { MOBILE_LAYOUT_MAX_WIDTH_PX } from '../../../constants/viewportBreakpoints'

// ── Types ──────────────────────────────────────────────────────────────────

export type SlotStatus = 'empty' | 'link-active' | 'onchain-pending' | 'redeemed'
type ExpandedAction = 'link' | 'onchain' | null
type EnsState = 'idle' | 'resolving' | 'resolved' | 'error'

export interface SlotData {
  id: number
  status: SlotStatus
  link?: string
  expiresAt?: Date
  invitedAddress?: string
  ensName?: string
  redeemedBy?: string
}

interface SlotCardProps {
  slot: SlotData
  onGenerateLink: (slotId: number) => Promise<void>
  onCopy: (slotId: number, link: string) => void
  onRevoke: (slotId: number) => void
  onInviteOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
  copied?: boolean
  loading?: boolean
  /** Showcase / static demos — start with link or onchain panel open */
  defaultExpandedAction?: Exclude<ExpandedAction, null>
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatExpiry(date: Date): string {
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (diffDays <= 0) return 'Expired'
  if (diffDays === 1) return 'Expires tomorrow'
  return `Expires in ${diffDays} days`
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

function isValidAddress(val: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(val)
}

function isEns(val: string): boolean {
  return val.endsWith('.eth') && val.length > 4
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SlotCard({
  slot,
  onGenerateLink,
  onCopy,
  onRevoke,
  onInviteOnchain,
  copied = false,
  loading = false,
  defaultExpandedAction,
}: SlotCardProps) {
  const [expandedAction, setExpandedAction] = useState<ExpandedAction>(
    slot.status === 'empty' ? (defaultExpandedAction ?? null) : null
  )
  const [addressInput, setAddressInput] = useState('')
  const [ensState, setEnsState] = useState<EnsState>('idle')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [revokePopoverPos, setRevokePopoverPos] = useState<{ top: number; left: number } | null>(
    null,
  )
  const revokeBtnRef = useRef<HTMLButtonElement>(null)
  const revokePopoverRef = useRef<HTMLDivElement>(null)

  const resetInput = () => {
    setAddressInput('')
    setEnsState('idle')
    setResolvedAddress('')
  }

  const toggleExpand = (action: ExpandedAction) => {
    if (expandedAction === action) {
      setExpandedAction(null)
      resetInput()
    } else {
      setExpandedAction(action)
      resetInput()
    }
  }

  const handleAddressChange = async (val: string) => {
    setAddressInput(val)
    setResolvedAddress('')
    if (isEns(val)) {
      setEnsState('resolving')
      await new Promise(r => setTimeout(r, 900))
      if (val === 'invalid.eth') {
        setEnsState('error')
      } else {
        const mock = '0x' + Math.random().toString(16).slice(2, 42)
        setResolvedAddress(mock)
        setEnsState('resolved')
      }
    } else if (isValidAddress(val)) {
      setEnsState('resolved')
      setResolvedAddress(val)
    } else {
      setEnsState('idle')
    }
  }

  const handleGenerateLink = async () => {
    await onGenerateLink(slot.id)
    setExpandedAction(null)
  }

  const handleInviteOnchain = async () => {
    const address = resolvedAddress || addressInput
    if (!address) return
    await onInviteOnchain(
      slot.id,
      address,
      isEns(addressInput) ? addressInput : undefined
    )
    setExpandedAction(null)
    resetInput()
  }

  const canSubmitOnchain =
    ensState === 'resolved' && (resolvedAddress !== '' || isValidAddress(addressInput))

  const updateRevokePopoverPosition = () => {
    const anchor = revokeBtnRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const popover = revokePopoverRef.current
    const popoverHeight = popover?.offsetHeight ?? 120
    const popoverWidth = popover?.offsetWidth ?? 220
    const gap = 6
    const viewportMargin = 20
    const isMobile = window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`).matches

    if (isMobile) {
      let left = rect.right - popoverWidth
      left = Math.max(
        viewportMargin,
        Math.min(left, window.innerWidth - popoverWidth - viewportMargin),
      )
      let top = rect.top - gap - popoverHeight
      if (top < viewportMargin) {
        top = rect.bottom + gap
      }
      setRevokePopoverPos({ top, left })
      return
    }

    const top = rect.top - gap - popoverHeight
    setRevokePopoverPos({ top, left: rect.right })
  }

  useLayoutEffect(() => {
    if (!revokeConfirmOpen) {
      setRevokePopoverPos(null)
      return
    }
    updateRevokePopoverPosition()
  }, [revokeConfirmOpen])

  useEffect(() => {
    if (!revokeConfirmOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRevokeConfirmOpen(false)
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (revokeBtnRef.current?.contains(target)) return
      if (revokePopoverRef.current?.contains(target)) return
      setRevokeConfirmOpen(false)
    }

    const onReposition = () => updateRevokePopoverPosition()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [revokeConfirmOpen])

  const handleConfirmRevoke = () => {
    onRevoke(slot.id)
    setRevokeConfirmOpen(false)
  }

  const isExpanded = expandedAction !== null
  const isAvailable = slot.status === 'empty'

  return (
    <div
      className={[
        styles.card,
        isExpanded ? styles.expanded : '',
      ].join(' ')}
    >
      {/* ── Main row ── */}
      <div className={styles.row}>
        {/* Badge */}
        <div className={[styles.badge, isAvailable && styles.badgeAvailable].filter(Boolean).join(' ')}>
          <span className={styles.badgeNumber}>{slot.id}</span>
        </div>

        {/* Empty label */}
        {slot.status === 'empty' && (
          <span className={styles.availableLabel}>Available</span>
        )}

        {/* Right content */}
        <div className={styles.right}>

          {/* Empty — action buttons */}
          {slot.status === 'empty' && (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                size="sm"
                label="Create link"
                showIcon={false}
                onClick={() => toggleExpand('link')}
              />
              <Button
                variant="secondary"
                size="sm"
                label="Invite onchain"
                showIcon={false}
                onClick={() => toggleExpand('onchain')}
              />
            </div>
          )}

          {/* Link active */}
          {slot.status === 'link-active' && slot.link && (
            <div className={styles.linkRow}>
              <div className={styles.linkStack}>
                <span className={styles.linkText}>{slot.link}</span>
                <div className={styles.linkMeta}>
                  <span className={styles.pendingLabel}>Pending</span>
                  {slot.expiresAt && (
                    <>
                      <span className={styles.dot} aria-hidden="true">·</span>
                      <span className={styles.expiry}>{formatExpiry(slot.expiresAt)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.linkButtons}>
                <button
                  className={styles.textBtn}
                  onClick={() => onCopy(slot.id, slot.link!)}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  ref={revokeBtnRef}
                  type="button"
                  className={[styles.textBtn, styles.textBtnDanger].join(' ')}
                  aria-expanded={revokeConfirmOpen}
                  aria-haspopup="dialog"
                  onClick={() => {
                    if (revokeConfirmOpen) {
                      setRevokeConfirmOpen(false)
                      return
                    }
                    setRevokeConfirmOpen(true)
                  }}
                >
                  Revoke
                </button>
              </div>
            </div>
          )}

          {/* Onchain pending */}
          {slot.status === 'onchain-pending' && slot.invitedAddress && (
            <div className={styles.statusRow}>
              <div className={styles.addressStack}>
                <span className={styles.addressPrimary}>
                  {slot.ensName ?? truncateAddress(slot.invitedAddress)}
                </span>
                {slot.ensName && (
                  <span className={styles.addressSecondary}>
                    {truncateAddress(slot.invitedAddress)}
                  </span>
                )}
              </div>
              <Tag label="Invited" dot="lavender" />
            </div>
          )}

          {/* Redeemed */}
          {slot.status === 'redeemed' && (
            <div className={styles.statusRow}>
              <span className={styles.addressPrimary}>
                {slot.redeemedBy
                  ? truncateAddress(slot.redeemedBy)
                  : 'Link redeemed'}
              </span>
              <Tag label="Joined" dot="active" />
            </div>
          )}

        </div>
      </div>

      {/* ── Expanded: create link ── */}
      {slot.status === 'empty' && expandedAction === 'link' && (
        <div className={styles.expandedSection}>
          <p className={styles.hint}>
            Your wallet will sign a message to generate the link. No gas required.
          </p>
          <div className={styles.expandedAction}>
            <Button
              variant="primary"
              size="sm"
              label={loading ? 'Generating…' : 'Generate link'}
              showIcon={false}
              onClick={handleGenerateLink}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {/* ── Expanded: invite onchain ── */}
      {slot.status === 'empty' && expandedAction === 'onchain' && (
        <div className={styles.expandedSection}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={[
                styles.input,
                ensState === 'error' ? styles.inputError : '',
                ensState === 'resolved' ? styles.inputResolved : '',
              ].join(' ')}
              placeholder="0x… or name.eth"
              value={addressInput}
              onChange={e => handleAddressChange(e.target.value)}
              aria-label="Wallet address or ENS name"
              spellCheck={false}
            />
            {ensState === 'resolving' && (
              <span className={styles.spinner} aria-label="Resolving ENS" />
            )}
            {ensState === 'resolved' &&
              resolvedAddress &&
              resolvedAddress !== addressInput && (
                <span className={styles.inlineResolved}>
                  {truncateAddress(resolvedAddress)}
                </span>
              )}
          </div>
          {ensState === 'error' && (
            <span className={styles.errorMsg}>ENS name not found</span>
          )}
          <p className={styles.hint}>
            This sends an onchain transaction. The invitee can then visit
            armada.wtf and commit. Requires gas.
          </p>
          <div className={styles.expandedAction}>
            <Button
              variant="primary"
              size="sm"
              label={loading ? 'Inviting…' : 'Send invite'}
              showIcon={false}
              onClick={handleInviteOnchain}
              disabled={!canSubmitOnchain || loading}
            />
          </div>
        </div>
      )}

      {revokeConfirmOpen &&
        revokePopoverPos &&
        createPortal(
          <div
            ref={revokePopoverRef}
            className={styles.revokePopover}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`revoke-title-${slot.id}`}
            style={{ top: revokePopoverPos.top, left: revokePopoverPos.left }}
          >
            <p id={`revoke-title-${slot.id}`} className={styles.revokeTitle}>
              Revoke invite link?
            </p>
            <p className={styles.revokeBody}>
              This link will stop working. You can generate a new one anytime.
            </p>
            <div className={styles.revokeActions}>
              <Button
                variant="secondary"
                size="sm"
                label="Revoke link"
                showIcon={false}
                className={styles.revokeConfirmBtn}
                onClick={handleConfirmRevoke}
              />
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                showIcon={false}
                className={styles.revokeCancelBtn}
                onClick={() => setRevokeConfirmOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
