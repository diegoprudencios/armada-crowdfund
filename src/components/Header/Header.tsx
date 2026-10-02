import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { WalletIcon } from '@heroicons/react/24/outline'
import {
  WalletMetamask,
  WalletPhantom,
  WalletWalletConnect,
} from '@web3icons/react'
import { ArmadaLogo } from '../ArmadaLogo'
import { NavBar, NavBarItem } from '../NavBar'
import { Button } from '../Button'
import { WalletPillMenu } from './WalletPillMenu'
import { WalletMenuSheet } from './WalletMenuSheet'
import styles from './Header.module.css'

export interface HeaderProps {
  /** Crowdfund · Your position · Claim (Claim gated until claimAvailable). */
  activeNav?: 'crowdfund' | 'myposition' | 'claim'
  walletAddress?: string
  /** Full address for clipboard copy in the wallet menu. */
  walletCopyAddress?: string
  walletProvider?: string
  usdcBalance?: number
  onDisconnect?: () => void
  /** When false, show Connect wallet pill. Defaults to true. */
  walletConnected?: boolean
  /** When false, Claim stays in the nav but is not navigable. */
  claimAvailable?: boolean
  onMyPosition?: () => void
  onCrowdfund?: () => void
  onClaim?: () => void
  onParticipate?: () => void
  onConnectWallet?: () => void
  className?: string
  /** Hide header when scrolling down; show when scrolling up (near top always visible). */
  autoHideOnScroll?: boolean
  /**
   * `hero` — crowdfund full-screen experience: floating header on desktop;
   * on mobile, logo + wallet with nav pills under the header (in document flow).
   */
  layout?: 'default' | 'hero'
}

const SCROLL_DELTA = 6
const WALLET_TRIGGER_ICON_PX = 22

const MY_POSITION_PATH = `${import.meta.env.BASE_URL}?view=myposition`
const CROWDFUND_PATH = `${import.meta.env.BASE_URL}`
const CLAIM_PATH = `${import.meta.env.BASE_URL}crowdfund-stages#claim-flow`

function MobileWalletTriggerIcon({
  provider,
  size = WALLET_TRIGGER_ICON_PX,
}: {
  provider?: string
  size?: number
}) {
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

export function Header({
  activeNav = 'crowdfund',
  walletAddress = '0x6545...54534',
  walletCopyAddress,
  walletProvider = 'metamask',
  usdcBalance = 0,
  onDisconnect,
  walletConnected = true,
  claimAvailable = false,
  onMyPosition,
  onCrowdfund,
  onClaim,
  onParticipate,
  onConnectWallet,
  className,
  autoHideOnScroll = true,
  layout = 'default',
}: HeaderProps) {
  const [concealed, setConcealed] = useState(false)
  const [walletSheetOpen, setWalletSheetOpen] = useState(false)
  const lastY = useRef(0)
  const walletSheetId = useId()
  const showMobileNav = layout === 'hero'

  const handleCrowdfund = () => {
    if (onCrowdfund) {
      onCrowdfund()
      return
    }
    if (activeNav !== 'crowdfund') {
      window.location.assign(CROWDFUND_PATH)
    }
  }

  const handleMyPosition = () => {
    if (onMyPosition) {
      onMyPosition()
      return
    }
    if (activeNav !== 'myposition') {
      window.location.assign(MY_POSITION_PATH)
    }
  }

  const handleClaim = () => {
    if (!claimAvailable) return
    if (onClaim) {
      onClaim()
      return
    }
    window.location.assign(CLAIM_PATH)
  }

  const closeWalletSheet = () => setWalletSheetOpen(false)

  const navItems = useMemo<NavBarItem[]>(
    () => [
      {
        label: 'Crowdfund',
        active: activeNav === 'crowdfund',
        onClick: activeNav !== 'crowdfund' ? handleCrowdfund : undefined,
      },
      {
        label: 'Your position',
        active: activeNav === 'myposition',
        onClick: activeNav !== 'myposition' ? handleMyPosition : undefined,
      },
      {
        label: 'Claim',
        // Claim opens a modal — never treat it as the selected page tab.
        active: false,
        disabled: !claimAvailable,
        accent: claimAvailable ? 'brand' : undefined,
        onClick: claimAvailable ? handleClaim : undefined,
      },
    ],
    [activeNav, claimAvailable, onCrowdfund, onMyPosition, onClaim],
  )

  useEffect(() => {
    if (!autoHideOnScroll) {
      setConcealed(false)
      return
    }

    lastY.current = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      if (y < 48) {
        setConcealed(false)
      } else if (y > lastY.current + SCROLL_DELTA) {
        setConcealed(true)
      } else if (y < lastY.current - SCROLL_DELTA) {
        setConcealed(false)
      }
      lastY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [autoHideOnScroll])

  useEffect(() => {
    if (!walletConnected) setWalletSheetOpen(false)
  }, [walletConnected])

  const headerClass = [
    styles.header,
    layout === 'hero' && styles.headerHero,
    concealed && styles.concealed,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <header className={headerClass}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <ArmadaLogo variant="full" className={styles.logoFull} />
          </div>
          <NavBar items={navItems} className={styles.desktopNav} />
        </div>

        <div className={styles.actions}>
          {walletConnected ? (
            <WalletPillMenu
              displayAddress={walletAddress}
              copyAddress={walletCopyAddress ?? walletAddress}
              walletProvider={walletProvider}
              usdcBalance={usdcBalance}
              onDisconnect={onDisconnect}
            />
          ) : (
            <Button
              variant="secondary"
              size="md"
              label="Connect wallet"
              showIcon={false}
              onClick={onConnectWallet}
            />
          )}
          {!claimAvailable && onParticipate && (
            <Button
              variant="gradient"
              size="md"
              label="Participate"
              showIcon
              icon="arrow-right-micro"
              onClick={onParticipate}
            />
          )}
        </div>

        <div className={styles.mobileActions}>
          {walletConnected ? (
            <button
              type="button"
              className={styles.walletCircleBtn}
              aria-expanded={walletSheetOpen}
              aria-controls={walletSheetId}
              aria-haspopup="dialog"
              aria-label={walletSheetOpen ? 'Close wallet menu' : 'Open wallet menu'}
              onClick={() => setWalletSheetOpen((open) => !open)}
            >
              <MobileWalletTriggerIcon provider={walletProvider} />
            </button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              label="Connect"
              showIcon={false}
              className={styles.mobileConnectBtn}
              onClick={onConnectWallet}
            />
          )}
        </div>
      </header>

      {showMobileNav ? (
        <>
          <div className={styles.mobileNav}>
            <NavBar items={navItems} className={styles.mobileNavBar} />
          </div>
          <WalletMenuSheet
            id={walletSheetId}
            open={walletSheetOpen && walletConnected}
            onClose={closeWalletSheet}
            walletAddress={walletAddress}
            walletCopyAddress={walletCopyAddress}
            walletProvider={walletProvider}
            usdcBalance={usdcBalance}
            onDisconnect={onDisconnect}
          />
        </>
      ) : null}
    </>
  )
}
