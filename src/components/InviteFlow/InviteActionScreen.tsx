// ABOUTME: In-place invite action screen — method pick + link / onchain form for a target hop.

import { useEffect, useId, useRef, useState } from 'react'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import type { InviteMethod } from '../../constants/inviteUx'
import { hopPillDotColor } from '../../constants/graphHopColors'
import { Button } from '../Button'
import {
  formatExpiryDays,
  formatInviteeHop,
  type InviteeHop,
} from '../MyPosition/inviteModel'
import { truncateAddress } from './screens/SlotCard'
import styles from './InviteActionScreen.module.css'

type EnsState = 'idle' | 'resolving' | 'resolved' | 'error'

export type CreatedInviteLink = {
  id: number
  link: string
  expiresAt: Date
}

export type CreatedOnchainInvite = {
  id: number
  address: string
  ensName?: string
}

function isValidAddress(val: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(val)
}

function isEns(val: string): boolean {
  return val.endsWith('.eth') && val.length > 4
}

function isPasteableAddress(val: string): boolean {
  const trimmed = val.trim()
  return isValidAddress(trimmed) || isEns(trimmed)
}

function inviteLinkPath(url: string): string {
  try {
    const parsed = new URL(url)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return path.startsWith('/') ? path : `/${path}`
  } catch {
    return url.startsWith('/') ? url : `/${url}`
  }
}

function hopVariantForInvitee(hop: InviteeHop): 'hop-1' | 'hop-2' {
  return hop === 2 ? 'hop-2' : 'hop-1'
}

export interface InviteActionScreenProps {
  /** Target hop the invitee will join. Prefer over slotId for the hop-based card. */
  hop?: InviteeHop
  /** @deprecated Slot-index demos (InviteSlots / participate modal). */
  slotId?: number
  method: InviteMethod | null
  loading?: boolean
  onBack: () => void
  onSelectMethod?: (method: InviteMethod) => void
  onGenerateLink: (target: InviteeHop | number) => Promise<CreatedInviteLink | void>
  onInviteOnchain: (
    target: InviteeHop | number,
    address: string,
    ensName?: string,
  ) => Promise<CreatedOnchainInvite | void>
  onCopy?: (id: number, link: string) => void
  onRevoke?: (id: number) => void | Promise<void>
  /** Reveal deferred invite in the sent list (Done / close confirmation). */
  onConfirmCreated?: (id: number) => void
  /** Drop deferred invite revoked from confirmation (never shown in list). */
  onDiscardCreated?: (id: number) => void
  copiedInviteId?: number | null
}

export function InviteActionScreen({
  hop,
  slotId,
  method,
  loading = false,
  onBack,
  onSelectMethod,
  onGenerateLink,
  onInviteOnchain,
  onCopy,
  onRevoke,
  onConfirmCreated,
  onDiscardCreated,
  copiedInviteId = null,
}: InviteActionScreenProps) {
  const [addressInput, setAddressInput] = useState('')
  const [ensState, setEnsState] = useState<EnsState>('idle')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [createdLink, setCreatedLink] = useState<CreatedInviteLink | null>(null)
  const [createdOnchain, setCreatedOnchain] = useState<CreatedOnchainInvite | null>(
    null,
  )
  const [clipboardPaste, setClipboardPaste] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [linkMenuOpen, setLinkMenuOpen] = useState(false)
  const addressInputElRef = useRef<HTMLInputElement>(null)
  const linkMenuRef = useRef<HTMLDivElement>(null)
  const linkMenuId = useId()
  const pendingConfirmIdRef = useRef<number | null>(null)
  const createGenerationRef = useRef(0)

  const target = hop ?? slotId
  if (target == null) {
    throw new Error('InviteActionScreen requires hop or slotId')
  }

  const hopLabel = hop != null ? formatInviteeHop(hop) : `Slot ${slotId}`
  const hopColor =
    hop != null ? hopPillDotColor(hopVariantForInvitee(hop)) : null
  const title = createdLink
    ? 'Link ready to share'
    : createdOnchain
      ? 'Invite sent on-chain'
      : method === 'link'
        ? 'Create and share an invite link'
        : method === 'onchain'
          ? 'Whitelist new address'
          : `Invite to ${hopLabel}`

  const hasAddressInput = addressInput.trim().length > 0
  const showPasteBtn =
    method === 'onchain' &&
    !createdOnchain &&
    !hasAddressInput &&
    clipboardPaste != null
  const canSubmitOnchain =
    ensState === 'resolved' && (resolvedAddress !== '' || isValidAddress(addressInput))

  const primaryLabel =
    method === 'link'
      ? loading
        ? 'Creating…'
        : 'Create link'
      : method === 'onchain'
        ? loading
          ? 'Inviting…'
          : hasAddressInput
            ? 'Send invite'
            : 'Insert address'
        : 'Continue'

  const primaryBlocked =
    method == null
      ? true
      : method === 'onchain'
        ? !canSubmitOnchain || loading
        : loading

  useEffect(() => {
    if (method !== 'onchain' || createdLink || createdOnchain) return
    const id = window.requestAnimationFrame(() => {
      addressInputElRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [method, createdLink, createdOnchain])

  useEffect(() => {
    if (method !== 'onchain' || createdOnchain || hasAddressInput) {
      setClipboardPaste(null)
      return
    }

    let cancelled = false

    const syncClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText()
        if (cancelled) return
        setClipboardPaste(isPasteableAddress(text) ? text.trim() : null)
      } catch {
        if (!cancelled) setClipboardPaste(null)
      }
    }

    void syncClipboard()

    const onFocus = () => {
      void syncClipboard()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const intervalId = window.setInterval(() => {
      void syncClipboard()
    }, 1500)

    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(intervalId)
    }
  }, [method, createdOnchain, hasAddressInput])

  useEffect(() => {
    if (!linkMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (linkMenuRef.current?.contains(e.target as Node)) return
      setLinkMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkMenuOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [linkMenuOpen])

  const handleAddressChange = async (val: string) => {
    setAddressInput(val)
    setResolvedAddress('')
    if (isEns(val)) {
      setEnsState('resolving')
      await new Promise((r) => setTimeout(r, 900))
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

  const handlePaste = async () => {
    const fromState = clipboardPaste
    if (fromState) {
      setClipboardPaste(null)
      await handleAddressChange(fromState)
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = text.trim()
      if (isPasteableAddress(trimmed)) {
        setClipboardPaste(null)
        await handleAddressChange(trimmed)
      }
    } catch {
      addressInputElRef.current?.focus()
    }
  }

  const handleGenerateLink = async () => {
    if (loading) return
    const generation = ++createGenerationRef.current
    try {
      const created = await onGenerateLink(target)
      if (generation !== createGenerationRef.current) {
        if (created) onDiscardCreated?.(created.id)
        return
      }
      if (created) {
        pendingConfirmIdRef.current = created.id
        setCreatedLink(created)
      }
    } catch {
      // Keep the create screen open so the user can retry.
    }
  }

  const handleInviteOnchain = async () => {
    if (loading) return
    if (!canSubmitOnchain) {
      addressInputElRef.current?.focus()
      return
    }
    const address = resolvedAddress || addressInput
    const ensName = isEns(addressInput) ? addressInput : undefined
    const generation = ++createGenerationRef.current
    try {
      const created = await onInviteOnchain(target, address, ensName)
      if (generation !== createGenerationRef.current) {
        if (created) onDiscardCreated?.(created.id)
        return
      }
      if (created) {
        pendingConfirmIdRef.current = created.id
        setCreatedOnchain(created)
        return
      }
      pendingConfirmIdRef.current = -1
      setCreatedOnchain({ id: -1, address, ensName })
    } catch {
      // Keep the form open so the user can retry.
    }
  }

  const finishConfirmation = (discard: boolean) => {
    const id = pendingConfirmIdRef.current ?? createdLink?.id ?? createdOnchain?.id
    pendingConfirmIdRef.current = null
    if (id != null && id >= 0) {
      if (discard) onDiscardCreated?.(id)
      else onConfirmCreated?.(id)
    }
    onBack()
  }

  const handleCancel = () => {
    createGenerationRef.current += 1
    const id = pendingConfirmIdRef.current
    pendingConfirmIdRef.current = null
    if (id != null && id >= 0) onDiscardCreated?.(id)
    onBack()
  }

  const handleRevokeCreated = () => {
    if (revoking) return
    setRevoking(true)
    try {
      finishConfirmation(true)
    } finally {
      setRevoking(false)
    }
  }

  const hopTag =
    hop != null && hopColor != null ? (
      <span className={styles.hopLabelRow}>
        <span
          className={styles.hopDot}
          style={{ background: hopColor }}
          aria-hidden
        />
        <span className={styles.hopLabel}>Invite to {hopLabel}</span>
      </span>
    ) : (
      <p className={styles.slotLabel}>Slot {slotId}</p>
    )

  if (createdLink) {
    const copied = copiedInviteId === createdLink.id
    const canRevoke = onDiscardCreated != null || onRevoke != null
    return (
      <div className={styles.root}>
        <div className={styles.topRow}>
          <div className={styles.titleBlock}>
            {hopTag}
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.hint} role="status">
            Share it privately. The recipient opens the link, connects their wallet, and
            commits USDC to join the fleet.
          </p>
          <div className={styles.createdLinkBox}>
            <div className={styles.createdLinkMain}>
              <p className={styles.createdLinkPath}>{inviteLinkPath(createdLink.link)}</p>
              <p className={styles.createdLinkMeta}>
                Link pending · {formatExpiryDays(createdLink.expiresAt)}
              </p>
            </div>
            {canRevoke && (
              <div className={styles.createdLinkMenu} ref={linkMenuRef}>
                <button
                  type="button"
                  className={styles.moreBtn}
                  aria-label="Invite actions"
                  aria-haspopup="menu"
                  aria-expanded={linkMenuOpen}
                  aria-controls={linkMenuOpen ? linkMenuId : undefined}
                  onClick={() => setLinkMenuOpen((open) => !open)}
                >
                  <EllipsisHorizontalIcon className={styles.moreIcon} aria-hidden />
                </button>
                {linkMenuOpen && (
                  <ul id={linkMenuId} className={styles.moreMenu} role="menu">
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        className={[styles.moreMenuItem, styles.moreMenuItemDanger]
                          .filter(Boolean)
                          .join(' ')}
                        disabled={revoking}
                        onClick={() => {
                          setLinkMenuOpen(false)
                          handleRevokeCreated()
                        }}
                      >
                        {revoking ? 'Revoking…' : 'Revoke'}
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Button
            variant="secondary"
            size="sm"
            label="Done"
            showIcon={false}
            onClick={() => finishConfirmation(false)}
          />
          <Button
            variant="primary"
            size="sm"
            label={copied ? 'Copied' : 'Copy link'}
            showIcon={false}
            onClick={() => onCopy?.(createdLink.id, createdLink.link)}
          />
        </div>
      </div>
    )
  }

  if (createdOnchain) {
    const addressHeading = createdOnchain.ensName ?? createdOnchain.address
    const statusMeta = createdOnchain.ensName
      ? `Waiting to commit · ${truncateAddress(createdOnchain.address)}`
      : 'Waiting to commit'
    return (
      <div className={styles.root}>
        <div className={styles.topRow}>
          <div className={styles.titleBlock}>
            {hopTag}
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>

        <div className={styles.body}>
          <p className={styles.hint} role="status">
            They can visit armada.wtf, connect this wallet, and commit USDC anytime before
            the deadline.
          </p>
          <div className={styles.createdLinkBox}>
            <div className={styles.createdLinkMain}>
              <p
                className={
                  createdOnchain.ensName
                    ? styles.createdLinkPath
                    : styles.createdAddressMono
                }
              >
                {addressHeading}
              </p>
              <p className={styles.createdLinkMeta}>{statusMeta}</p>
            </div>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Button
            variant="secondary"
            size="sm"
            label="Done"
            showIcon={false}
            onClick={() => finishConfirmation(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          {hopTag}
          <h3 className={styles.title}>{title}</h3>
        </div>
      </div>

      <div className={styles.body}>
        {method == null && onSelectMethod && (
          <div className={styles.methodPick} role="group" aria-label="Invite method">
            <Button
              variant="secondary"
              size="sm"
              label="Share link"
              showIcon={false}
              onClick={() => onSelectMethod('link')}
            />
            <Button
              variant="secondary"
              size="sm"
              label="Whitelist new address"
              showIcon={false}
              onClick={() => onSelectMethod('onchain')}
            />
            <p className={styles.hint}>
              Share a link (no gas) or whitelist an address onchain. The invitee joins at{' '}
              {hopLabel}.
            </p>
          </div>
        )}

        {method === 'link' && (
          <p className={styles.hint}>
            Your wallet will sign a message to generate the link — no gas required. You can
            revoke the link anytime before someone uses it.
          </p>
        )}

        {method === 'onchain' && (
          <>
            <div className={styles.inputWrapper}>
              <input
                ref={addressInputElRef}
                type="text"
                className={[
                  styles.input,
                  showPasteBtn && styles.inputWithPaste,
                  ensState === 'error' ? styles.inputError : '',
                  ensState === 'resolved' ? styles.inputResolved : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                placeholder="0x… or name.eth"
                value={addressInput}
                onChange={(e) => void handleAddressChange(e.target.value)}
                aria-label="Wallet address or ENS name"
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              <div className={styles.inputTrailing}>
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
                {showPasteBtn && (
                  <button
                    type="button"
                    className={styles.pasteBtn}
                    onClick={() => void handlePaste()}
                    aria-label="Paste address from clipboard"
                  >
                    Paste
                  </button>
                )}
              </div>
            </div>
            {ensState === 'error' && (
              <span className={styles.errorMsg}>ENS name not found</span>
            )}
            <p className={styles.hint}>
              This sends an onchain transaction. The invitee can then visit armada.wtf and
              commit. Requires gas.
            </p>
          </>
        )}
      </div>

      <div className={styles.ctaRow}>
        <Button
          variant="secondary"
          size="sm"
          label="Cancel"
          showIcon={false}
          disabled={loading}
          onClick={handleCancel}
        />
        {method != null && (
          <Button
            variant="primary"
            size="sm"
            label={primaryLabel}
            showIcon={false}
            disabled={primaryBlocked}
            className={primaryBlocked ? styles.ctaBlocked : undefined}
            onClick={() =>
              void (method === 'link' ? handleGenerateLink() : handleInviteOnchain())
            }
          />
        )}
      </div>
    </div>
  )
}
