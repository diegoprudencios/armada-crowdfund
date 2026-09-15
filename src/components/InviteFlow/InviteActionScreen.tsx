// ABOUTME: Slot-scoped invite action screen (generate link / whitelist address) shown after method pick.

import { useRef, useState } from 'react'
import type { InviteMethod } from '../../constants/inviteUx'
import { Button } from '../Button'
import { truncateAddress } from './screens/SlotCard'
import styles from './InviteActionScreen.module.css'

type EnsState = 'idle' | 'resolving' | 'resolved' | 'error'

function isValidAddress(val: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(val)
}

function isEns(val: string): boolean {
  return val.endsWith('.eth') && val.length > 4
}

export interface InviteActionScreenProps {
  slotId: number
  method: InviteMethod
  loading?: boolean
  onBack: () => void
  onGenerateLink: (slotId: number) => Promise<void>
  onInviteOnchain: (slotId: number, address: string, ensName?: string) => Promise<void>
}

export function InviteActionScreen({
  slotId,
  method,
  loading = false,
  onBack,
  onGenerateLink,
  onInviteOnchain,
}: InviteActionScreenProps) {
  const [addressInput, setAddressInput] = useState('')
  const [ensState, setEnsState] = useState<EnsState>('idle')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const addressInputElRef = useRef<HTMLInputElement>(null)

  const title = method === 'link' ? 'Share link' : 'Whitelist new address'
  const hasAddressInput = addressInput.trim().length > 0
  const canSubmitOnchain =
    ensState === 'resolved' && (resolvedAddress !== '' || isValidAddress(addressInput))

  const primaryLabel =
    method === 'link'
      ? loading
        ? 'Creating…'
        : 'Create link'
      : loading
        ? 'Inviting…'
        : hasAddressInput
          ? 'Send invite'
          : 'Insert address'

  /** Keep primary look; block cursor when the action can’t run yet. */
  const primaryBlocked =
    method === 'onchain' ? !canSubmitOnchain || loading : loading

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

  const handleGenerateLink = async () => {
    if (loading) return
    await onGenerateLink(slotId)
    onBack()
  }

  const handleInviteOnchain = async () => {
    if (loading) return
    if (!canSubmitOnchain) {
      addressInputElRef.current?.focus()
      return
    }
    const address = resolvedAddress || addressInput
    await onInviteOnchain(slotId, address, isEns(addressInput) ? addressInput : undefined)
    onBack()
  }

  return (
    <div className={styles.root}>
      <div className={styles.topRow}>
        <div className={styles.slotMeta}>
          <div className={styles.badge} aria-hidden>
            <span className={styles.badgeNumber}>{slotId}</span>
          </div>
          <div className={styles.titleBlock}>
            <p className={styles.slotLabel}>Slot {slotId}</p>
            <h3 className={styles.title}>{title}</h3>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {method === 'link' ? (
          <div className={styles.hintStack}>
            <p className={styles.hint}>
              Your wallet will sign a message to generate the link — no gas required. You can
              revoke the link anytime before someone uses it.
            </p>
            <p className={styles.hint}>
              Share it privately. The recipient opens the link, connects their wallet, and
              commits USDC to join the fleet.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.inputWrapper}>
              <input
                ref={addressInputElRef}
                type="text"
                className={[
                  styles.input,
                  ensState === 'error' ? styles.inputError : '',
                  ensState === 'resolved' ? styles.inputResolved : '',
                ].join(' ')}
                placeholder="0x… or name.eth"
                value={addressInput}
                onChange={(e) => void handleAddressChange(e.target.value)}
                aria-label="Wallet address or ENS name"
                spellCheck={false}
                autoComplete="off"
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
          onClick={onBack}
        />
        <Button
          variant="primary"
          size="sm"
          label={primaryLabel}
          showIcon={false}
          className={primaryBlocked ? styles.ctaBlocked : undefined}
          aria-disabled={primaryBlocked || undefined}
          onClick={() =>
            void (method === 'link' ? handleGenerateLink() : handleInviteOnchain())
          }
        />
      </div>
    </div>
  )
}
