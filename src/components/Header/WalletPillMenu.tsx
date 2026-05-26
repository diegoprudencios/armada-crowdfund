import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import {
  WalletMetamask,
  WalletPhantom,
  WalletWalletConnect,
} from '@web3icons/react'
import buttonStyles from '../Button/Button.module.css'
import styles from './WalletPillMenu.module.css'

export interface WalletPillMenuProps {
  /** Truncated address shown on the pill and in the menu header. */
  displayAddress: string
  /** Full address copied to clipboard. */
  copyAddress: string
  walletProvider?: string
  onDisconnect?: () => void
}

const PROVIDER_ICON_PX = 20

function WalletProviderIcon({ provider, size = PROVIDER_ICON_PX }: { provider?: string; size?: number }) {
  switch (provider) {
    case 'metamask':
      return <WalletMetamask size={size} aria-hidden />
    case 'phantom':
      return <WalletPhantom size={size} aria-hidden />
    case 'walletconnect':
      return <WalletWalletConnect size={size} aria-hidden />
    default:
      return <WalletIcon width={size} height={size} aria-hidden />
  }
}

export function WalletPillMenu({
  displayAddress,
  copyAddress,
  walletProvider,
  onDisconnect,
}: WalletPillMenuProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyAddress)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDisconnect = () => {
    setOpen(false)
    onDisconnect?.()
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={[
          buttonStyles.btn,
          buttonStyles.secondary,
          buttonStyles.md,
          buttonStyles.noIcon,
          styles.trigger,
        ].join(' ')}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.triggerIcon}>
          <WalletProviderIcon provider={walletProvider} size={16} />
        </span>
        <span className={styles.triggerLabel}>{displayAddress}</span>
        <ChevronDownIcon
          className={[styles.chevron, open && styles.chevronOpen].filter(Boolean).join(' ')}
          aria-hidden
        />
      </button>

      {open && (
        <div id={menuId} className={styles.menu} role="menu">
          <div className={styles.identity} role="none">
            <span className={styles.identityIcon}>
              <WalletProviderIcon provider={walletProvider} />
            </span>
            <p className={styles.address}>{displayAddress}</p>
          </div>

          <div className={styles.divider} role="separator" />

          <button
            type="button"
            role="menuitem"
            className={[styles.menuItem, copied && styles.menuItemCopied].filter(Boolean).join(' ')}
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <CheckIcon className={styles.menuItemIcon} aria-hidden />
            ) : (
              <ClipboardDocumentIcon className={styles.menuItemIcon} aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy address'}
          </button>

          {onDisconnect && (
            <>
              <div className={styles.divider} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={[styles.menuItem, styles.disconnect].join(' ')}
                onClick={handleDisconnect}
              >
                <ArrowRightOnRectangleIcon className={styles.menuItemIcon} aria-hidden />
                Disconnect
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
