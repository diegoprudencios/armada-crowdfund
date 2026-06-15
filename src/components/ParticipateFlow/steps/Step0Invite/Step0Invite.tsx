import { useEffect, useState } from 'react'
import HopPill, { type HopVariant } from '../../../HopPill/HopPill'
import hopPillStyles from '../../../HopPill/HopPill.module.css'
import JoinButton from '../../../JoinButton/JoinButton'
import styles from './Step0Invite.module.css'

const HOVER_EXPAND_QUERY = '(hover: hover) and (pointer: fine)'

export interface Step0InviteProps {
  hopVariant?: HopVariant
  daysLeft?: number
  onJoin: () => void
  /** Path 2/3 modal: wallet already connected — hide pre-connect eyebrow. */
  hideConnectEyebrow?: boolean
  /** Path 1 invite landing page layout and sizing. */
  variant?: 'default' | 'landing'
  className?: string
}

export default function Step0Invite({
  hopVariant = 'hop-1',
  daysLeft = 3,
  onJoin,
  hideConnectEyebrow = false,
  variant = 'default',
  className,
}: Step0InviteProps) {
  const [joinExpanded, setJoinExpanded] = useState(false)
  const [canHoverExpand, setCanHoverExpand] = useState(false)
  const isLanding = variant === 'landing'

  useEffect(() => {
    const media = window.matchMedia(HOVER_EXPAND_QUERY)
    const sync = () => setCanHoverExpand(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return (
    <div
      data-flow-shell
      className={[
        styles.card,
        isLanding && styles.cardLanding,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={() => {
        if (canHoverExpand) setJoinExpanded(true)
      }}
      onMouseLeave={() => {
        if (canHoverExpand) setJoinExpanded(false)
      }}
    >
      <video
        className={styles.media}
        src="/fleet.mp4"
        poster="/fleet.png"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      <div className={styles.overlay} />
      <div className={[styles.content, isLanding && styles.contentLanding].filter(Boolean).join(' ')}>
        <div className={styles.meta}>
          <span className={styles.metaLabel}>ARMADA CROWDFUND</span>
          <span className={styles.metaLabel}>{daysLeft} DAYS LEFT</span>
        </div>
        <div className={styles.bottom}>
          <div className={styles.copy}>
            {!hideConnectEyebrow && (
              <p className={styles.eyebrow}>CONNECT YOUR WALLET</p>
            )}
            <h1 className={styles.headline}>You are invited to join the fleet</h1>
          </div>
          <div className={[styles.footer, isLanding && styles.footerLanding].filter(Boolean).join(' ')}>
            <HopPill
              variant={hopVariant}
              className={isLanding ? hopPillStyles.landing : undefined}
            />
            <JoinButton onClick={onJoin} expanded={joinExpanded} size={isLanding ? 'lg' : 'md'} />
          </div>
        </div>
      </div>
    </div>
  )
}
