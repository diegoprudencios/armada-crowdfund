import HopPill, { type HopVariant } from '../../../HopPill/HopPill'
import hopPillStyles from '../../../HopPill/HopPill.module.css'
import JoinButton from '../../../JoinButton/JoinButton'
import styles from './Step0Invite.module.css'

export interface Step0InviteProps {
  hopVariant?: HopVariant
  daysLeft?: number
  onJoin: () => void
  /**
   * @deprecated Wallet connect is RainbowKit before this screen — eyebrow removed.
   * Kept so existing callers keep compiling.
   */
  hideConnectEyebrow?: boolean
  /** Path 1 invite landing page layout and sizing. */
  variant?: 'default' | 'landing'
  className?: string
}

export default function Step0Invite({
  hopVariant = 'hop-1',
  daysLeft = 3,
  onJoin,
  variant = 'default',
  className,
}: Step0InviteProps) {
  const isLanding = variant === 'landing'

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
    >
      <img
        className={styles.media}
        src="/fleet.png"
        alt=""
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
            <h1 className={styles.headline}>You are invited to join the fleet</h1>
          </div>
          <div className={[styles.footer, isLanding && styles.footerLanding].filter(Boolean).join(' ')}>
            <HopPill
              variant={hopVariant}
              className={isLanding ? hopPillStyles.landing : undefined}
            />
            <JoinButton onClick={onJoin} size={isLanding ? 'lg' : 'md'} />
          </div>
        </div>
      </div>
    </div>
  )
}
