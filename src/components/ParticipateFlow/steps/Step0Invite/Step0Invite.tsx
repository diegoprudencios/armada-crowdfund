import { useState } from 'react'
import HopPill, { type HopVariant } from '../../../HopPill/HopPill'
import JoinButton from '../../../JoinButton/JoinButton'
import styles from './Step0Invite.module.css'

export interface Step0InviteProps {
  hopVariant?: HopVariant
  daysLeft?: number
  onJoin: () => void
  /** Path 2/3 modal: wallet already connected — hide pre-connect eyebrow. */
  hideConnectEyebrow?: boolean
}

export default function Step0Invite({
  hopVariant = 'hop-1',
  daysLeft = 3,
  onJoin,
  hideConnectEyebrow = false,
}: Step0InviteProps) {
  const [joinExpanded, setJoinExpanded] = useState(false)

  return (
    <div
      className={styles.card}
      onMouseEnter={() => setJoinExpanded(true)}
      onMouseLeave={() => setJoinExpanded(false)}
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
      <div className={styles.content}>
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
          <div className={styles.footer}>
            <HopPill variant={hopVariant} />
            <JoinButton onClick={onJoin} expanded={joinExpanded} />
          </div>
        </div>
      </div>
    </div>
  )
}
