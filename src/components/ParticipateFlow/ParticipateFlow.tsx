import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import {
  WalletMetamask,
  WalletCoinbase,
  WalletWalletConnect,
} from '@web3icons/react'
import HopPill from '../HopPill/HopPill'
import JoinButton from '../JoinButton/JoinButton'
import Steps from '../Steps/Steps'
import WalletItem from '../WalletItem/WalletItem'
import styles from './ParticipateFlow.module.css'

const STEPS = ['Connect', 'Commit', 'Review', 'Confirmation'] as const

function ArmadaLogo() {
  return (
    <svg
      width="132"
      height="32"
      viewBox="0 0 132 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M16.0001 32L13.405 29.405H18.5951L16.0001 32Z" fill="url(#pf-lg0)" />
      <path d="M20.3249 27.6752H11.6752L9.51334 25.5134H22.4868L20.3249 27.6752Z" fill="url(#pf-lg1)" />
      <path d="M16.0005 23.7837H7.78361L5.62103 21.6211H13.8379L16.0005 23.7837Z" fill="url(#pf-lg2)" />
      <path d="M24.2164 23.7837H16.0009L18.1634 21.6211H26.379L24.2164 23.7837Z" fill="url(#pf-lg3)" />
      <path d="M12.1081 19.8914H3.8913L1.72943 17.7296H9.94628L12.1081 19.8914Z" fill="url(#pf-lg4)" />
      <path d="M28.1087 19.8914H19.8932L22.055 17.7296H30.2706L28.1087 19.8914Z" fill="url(#pf-lg5)" />
      <path d="M32 15.9997H23.7845L16.0007 8.21604L8.21685 15.9997H0L16.0001 0L32 15.9997Z" fill="url(#pf-lg6)" />
      <path
        d="M54.5439 23.9917H51.5312L50.4043 20.4985H45.8184L44.9795 17.896H49.5645L47.2725 10.7837L44.9795 17.896L43.0146 23.9917H40L45.502 8.0083H49.042L54.5439 23.9917ZM62.4424 8.0083C63.5382 8.00834 64.5015 8.2097 65.3301 8.61279C66.1601 9.01591 66.7987 9.5882 67.248 10.3257C67.6975 11.0648 67.9219 11.898 67.9219 12.8267C67.9219 13.7553 67.6857 14.6083 67.2139 15.3384C66.8193 15.9489 66.2924 16.4427 65.6367 16.8247C66.2683 17.2309 66.7727 17.7419 67.1465 18.3628C67.6183 19.1467 67.8545 20.034 67.8545 21.0239V23.9917H64.9775V21.0239C64.9775 20.3999 64.8546 19.8639 64.6113 19.4146C64.368 18.9652 64.0023 18.6231 63.5156 18.3872C63.0289 18.1513 62.4346 18.0327 61.7344 18.0327H58.9717V23.9917H56.1416V8.0083H62.4424ZM73.3135 8.01611L73.3379 8.0083L77.916 19.6421L82.4951 8.0083L82.5439 8.02393L82.541 8.0083H85.8291V23.9917H83.1797V12.73L78.7734 23.9917H77.0391L72.6523 12.6987V23.9907H70.0039V8.0083H73.3154L73.3135 8.01611ZM101.966 23.9917H98.9521L97.8252 20.4985H93.2402L92.4004 17.896H96.9863L94.6943 10.7837L92.4004 17.896L90.4346 23.9917H87.4209L92.9229 8.0083H96.4639L101.966 23.9917ZM109.066 8.0083C110.619 8.00835 111.973 8.35906 113.13 9.05908C114.287 9.75931 115.178 10.715 115.802 11.9243C116.426 13.1351 116.737 14.4926 116.737 16.0005C116.737 17.5083 116.426 18.8659 115.802 20.0767C115.178 21.2876 114.286 22.2416 113.13 22.9419C111.973 23.6421 110.619 23.9916 109.066 23.9917H103.562V8.0083H109.066ZM125.83 8.0083L131.333 23.9917H128.318L127.193 20.4985H122.607L121.769 17.896H126.354L124.061 10.7837L121.769 17.896L119.802 23.9917H116.789L122.291 8.0083H125.83ZM106.394 21.2974H106.395V20.9546C106.395 21.183 106.509 21.2974 106.737 21.2974H108.838C109.872 21.2973 110.767 21.0686 111.521 20.6118C112.275 20.1549 112.845 19.5274 113.233 18.7271C113.622 17.9268 113.815 17.0192 113.815 15.9995C113.815 14.9799 113.621 14.0707 113.233 13.272C112.845 12.4732 112.275 11.8441 111.521 11.3872C110.767 10.9304 109.872 10.7017 108.838 10.7017H106.394V21.2974ZM58.9717 15.52H62.1006C62.6945 15.52 63.2078 15.4286 63.6406 15.2466C64.0751 15.0644 64.4096 14.7943 64.6455 14.436C64.8814 14.0792 65 13.618 65 13.0552C65 12.4923 64.8814 12.0274 64.6455 11.6616C64.4097 11.2961 64.0861 11.0224 63.6758 10.8403C63.2652 10.6582 62.7766 10.5679 62.2139 10.5679H58.9717V15.52Z"
        fill="white"
      />
      <defs>
        <linearGradient id="pf-lg0" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg1" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg2" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg3" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg4" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg5" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
        <linearGradient id="pf-lg6" x1="16" y1="32" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8D197" />
          <stop offset="1" stopColor="#CA8AEA" />
        </linearGradient>
      </defs>
    </svg>
  )
}

interface ParticipateFlowProps {
  /** `overlay` = full-screen modal (Hero). `embedded` = inline preview (Showcase). */
  variant?: 'overlay' | 'embedded'
  isOpen?: boolean
  onClose?: () => void
  initialStep?: number
  daysLeft?: string
}

export default function ParticipateFlow({
  variant = 'overlay',
  isOpen = false,
  onClose = () => {},
  initialStep,
  daysLeft = '3 DAYS LEFT',
}: ParticipateFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep ?? 1)
  const [fleetCardHovered, setFleetCardHovered] = useState(false)

  if (variant === 'overlay' && !isOpen) return null

  const isInvite = currentStep === 1
  const isOverlay = variant === 'overlay'

  const handleNext = () => setCurrentStep(2)

  const flow = (
    <>
      <div className={styles.pageLogo}>
        <ArmadaLogo />
      </div>

      <div className={styles.column}>
        <div
          className={[
            styles.fleetCard,
            isInvite && styles.fleetCardInvite,
            !isInvite && styles.fleetCardConnect,
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseEnter={() => setFleetCardHovered(true)}
          onMouseLeave={() => setFleetCardHovered(false)}
        >
          <video
            src="/fleet.mp4"
            poster="/fleet.png"
            autoPlay
            loop
            muted
            playsInline
            className={styles.fleetMedia}
            aria-hidden
          />
          <div
            className={[styles.fleetOverlay, !isInvite && styles.fleetOverlayConnect]
              .filter(Boolean)
              .join(' ')}
          />

          {isOverlay && (
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
              <XMarkIcon width={14} height={14} />
            </button>
          )}

          <div className={styles.fleetContent}>
            {isInvite ? (
              <>
                <div className={styles.cardTop}>
                  <span className={styles.meta}>ARMADA CROWDFUND</span>
                  <span className={styles.meta}>{daysLeft}</span>
                </div>

                <div className={styles.bottomBlock}>
                  <div className={styles.copyBlock}>
                    <p className={styles.eyebrow}>CONNECT YOUR WALLET</p>
                    <h2 className={styles.headline}>You are invited to join the fleet</h2>
                  </div>

                  <div className={styles.cardFooter}>
                    <HopPill variant="hop-1" />
                    <JoinButton onClick={handleNext} expanded={fleetCardHovered} />
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.connectBody}>
                <Steps steps={[...STEPS]} currentStep={currentStep} />

                {currentStep === 2 && (
                  <div className={styles.walletList}>
                    <WalletItem
                      name="MetaMask"
                      iconComponent={<WalletMetamask size={24} />}
                      onClick={() => setCurrentStep(3)}
                    />
                    <WalletItem
                      name="Coinbase Wallet"
                      iconComponent={<WalletCoinbase size={24} />}
                      onClick={() => setCurrentStep(3)}
                    />
                    <WalletItem
                      name="WalletConnect"
                      iconComponent={<WalletWalletConnect size={24} />}
                      onClick={() => setCurrentStep(3)}
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className={styles.placeholder}>Step 3 — coming soon</div>
                )}
                {currentStep === 4 && (
                  <div className={styles.placeholder}>Step 4 — coming soon</div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className={styles.dismiss}>Not ready to participate yet?</p>
        <div className={styles.navRow}>
          <button type="button" className={styles.navPill} onClick={onClose}>
            The project
          </button>
          <button type="button" className={styles.navPill} onClick={onClose}>
            Crowdfund
          </button>
        </div>
      </div>
    </>
  )

  if (isOverlay) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Participate">
        {flow}
      </div>
    )
  }

  return <div className={styles.embedded}>{flow}</div>
}
