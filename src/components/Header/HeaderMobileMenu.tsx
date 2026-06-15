import { useEffect, useRef, useState } from 'react'
import {
  ArrowRightOnRectangleIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  WalletMetamask,
  WalletPhantom,
  WalletWalletConnect,
} from '@web3icons/react'
import { ArmadaLogo } from '../ArmadaLogo'
import { Participate } from '../Participate'
import { Button } from '../Button'
import styles from './HeaderMobileMenu.module.css'

const WALLET_ICON_PX = 48
const ROUND_ACTION_ICON_PX = 20

function WalletProviderIcon({ provider, size = WALLET_ICON_PX }: { provider?: string; size?: number }) {
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

function MenuSeparator() {
  return <hr className={styles.separator} aria-hidden />
}

export interface HeaderMobileMenuNavItem {
  label: string
  active?: boolean
  onClick?: () => void
}

export interface HeaderMobileMenuProps {
  id: string
  open: boolean
  onClose: () => void
  navItems: HeaderMobileMenuNavItem[]
  myPositionItem?: HeaderMobileMenuNavItem
  walletConnected?: boolean
  walletAddress?: string
  walletCopyAddress?: string
  walletProvider?: string
  usdcBalance?: number
  onDisconnect?: () => void
  onConnectWallet?: () => void
  onParticipate?: () => void
  claimAvailable?: boolean
  onClaim?: () => void
}

export function HeaderMobileMenu({
  id,
  open,
  onClose,
  navItems,
  myPositionItem,
  walletConnected = true,
  walletAddress = '',
  walletCopyAddress,
  walletProvider,
  usdcBalance = 0,
  onDisconnect,
  onConnectWallet,
  onParticipate,
  claimAvailable,
  onClaim,
}: HeaderMobileMenuProps) {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTarget = walletCopyAddress ?? walletAddress

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  if (!open) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyTarget)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect?.()
    onClose()
  }

  const balanceLabel = `${usdcBalance.toLocaleString('en-US')} USDC`
  const sectionSpacing = styles.sectionSpacing

  return (
    <div
      id={id}
      className={styles.panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className={styles.topBar}>
        <ArmadaLogo variant="mark" markTone="white" className={styles.logoMark} />
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close menu"
        >
          <XMarkIcon width={ROUND_ACTION_ICON_PX} height={ROUND_ACTION_ICON_PX} aria-hidden />
        </button>
      </div>

      <div className={styles.scroll}>
        {walletConnected ? (
          <div className={[styles.walletBlock, sectionSpacing].join(' ')}>
            <span className={styles.walletIcon}>
              <WalletProviderIcon provider={walletProvider} />
            </span>
            <p className={styles.walletAddress}>{walletAddress}</p>
            <p className={styles.walletBalance}>{balanceLabel}</p>
            <div className={styles.walletActions}>
              <button
                type="button"
                className={[styles.roundActionBtn, copied && styles.roundActionBtnCopied]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => void handleCopy()}
                aria-label={copied ? 'Copied' : 'Copy address'}
              >
                {copied ? (
                  <CheckIcon width={ROUND_ACTION_ICON_PX} height={ROUND_ACTION_ICON_PX} aria-hidden />
                ) : (
                  <ClipboardDocumentIcon
                    width={ROUND_ACTION_ICON_PX}
                    height={ROUND_ACTION_ICON_PX}
                    aria-hidden
                  />
                )}
              </button>
              {onDisconnect ? (
                <button
                  type="button"
                  className={styles.roundActionBtn}
                  onClick={handleDisconnect}
                  aria-label="Disconnect"
                >
                  <ArrowRightOnRectangleIcon
                    width={ROUND_ACTION_ICON_PX}
                    height={ROUND_ACTION_ICON_PX}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={[styles.walletBlock, styles.walletBlockDisconnected, sectionSpacing].join(' ')}>
            <Button
              variant="primary"
              size="lg"
              label="Connect wallet"
              showIcon={false}
              className={styles.connectWalletBtn}
              onClick={() => {
                onConnectWallet?.()
                onClose()
              }}
            />
          </div>
        )}

        <MenuSeparator />

        <nav className={[styles.nav, sectionSpacing].join(' ')} aria-label="Main">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={[styles.navItem, item.active && styles.navItemActive]
                .filter(Boolean)
                .join(' ')}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => {
                item.onClick?.()
                onClose()
              }}
            >
              {item.label}
            </button>
          ))}
          {myPositionItem ? (
            <button
              type="button"
              className={[
                styles.navItem,
                myPositionItem.active && styles.navItemActive,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={myPositionItem.active ? 'page' : undefined}
              onClick={() => {
                myPositionItem.onClick?.()
                onClose()
              }}
            >
              {myPositionItem.label}
            </button>
          ) : null}
        </nav>

        <MenuSeparator />

        {claimAvailable ? (
          <Button
            variant="ghost"
            size="md"
            label="Claim"
            showIcon={false}
            className={styles.claimBtn}
            onClick={() => {
              onClaim?.()
              onClose()
            }}
          />
        ) : null}

        {!claimAvailable ? (
          <Participate
            className={styles.participateCard}
            imageSrc="/fleet.png"
            videoSrc="/fleet.mp4"
            onCtaClick={() => {
              onParticipate?.()
              onClose()
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
