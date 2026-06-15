import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { ArmadaLogo } from '../ArmadaLogo'
import { NavBar, NavBarItem } from '../NavBar'
import { Button } from '../Button'
import { WalletPillMenu } from './WalletPillMenu'
import { HeaderMobileMenu } from './HeaderMobileMenu'
import styles from './Header.module.css'

export interface HeaderProps {
  activeNav?: 'project' | 'crowdfund' | 'myposition'
  walletAddress?: string
  /** Full address for clipboard copy in the wallet menu. */
  walletCopyAddress?: string
  walletProvider?: string
  usdcBalance?: number
  onDisconnect?: () => void
  /** When false, show Connect wallet pill and hide My position. Defaults to true. */
  walletConnected?: boolean
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
   * on mobile, full logo + burger menu with nav/actions in a panel.
   */
  layout?: 'default' | 'hero'
}

const SCROLL_DELTA = 6
const BURGER_ICON_PX = 20

const MY_POSITION_PATH = `${import.meta.env.BASE_URL}?view=myposition`
const CROWDFUND_PATH = `${import.meta.env.BASE_URL}`

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const lastY = useRef(0)
  const mobileMenuId = useId()

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

  const closeMobileMenu = () => setMobileMenuOpen(false)

  const navItems = useMemo<NavBarItem[]>(
    () => [
      { label: 'The project', active: activeNav === 'project' },
      {
        label: 'Crowdfund',
        active: activeNav === 'crowdfund',
        onClick: activeNav !== 'crowdfund' ? handleCrowdfund : undefined,
      },
    ],
    [activeNav, onCrowdfund],
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
    if (!mobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const headerClass = [
    styles.header,
    layout === 'hero' && styles.headerHero,
    layout === 'hero' && mobileMenuOpen && styles.headerHeroMenuOpen,
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
          {walletConnected && (
            <Button
              variant="ghost"
              size="md"
              label="My position"
              showIcon={false}
              onClick={handleMyPosition}
              className={activeNav === 'myposition' ? styles.myPositionActive : undefined}
            />
          )}
          {claimAvailable && (
            <Button variant="ghost" size="md" label="Claim" showIcon={false} onClick={onClaim} />
          )}
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
          {!claimAvailable && (
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

        <button
          type="button"
          className={styles.burgerBtn}
          aria-expanded={mobileMenuOpen}
          aria-controls={mobileMenuId}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? (
            <XMarkIcon width={BURGER_ICON_PX} height={BURGER_ICON_PX} aria-hidden />
          ) : (
            <Bars3Icon width={BURGER_ICON_PX} height={BURGER_ICON_PX} aria-hidden />
          )}
        </button>
      </header>

      {layout === 'hero' ? (
        <HeaderMobileMenu
          id={mobileMenuId}
          open={mobileMenuOpen}
          onClose={closeMobileMenu}
          navItems={navItems}
          myPositionItem={
            walletConnected
              ? {
                  label: 'My Position',
                  active: activeNav === 'myposition',
                  onClick: handleMyPosition,
                }
              : undefined
          }
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          walletCopyAddress={walletCopyAddress}
          walletProvider={walletProvider}
          usdcBalance={usdcBalance}
          onDisconnect={onDisconnect}
          onConnectWallet={onConnectWallet}
          onParticipate={onParticipate}
          claimAvailable={claimAvailable}
          onClaim={onClaim}
        />
      ) : null}
    </>
  )
}
