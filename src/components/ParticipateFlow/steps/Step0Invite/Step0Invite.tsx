import { useEffect, useMemo, useState } from 'react'
import HopPill, { type HopVariant } from '../../../HopPill/HopPill'
import hopPillStyles from '../../../HopPill/HopPill.module.css'
import JoinButton from '../../../JoinButton/JoinButton'
import { Tag } from '../../../Tag'
import {
  endsAtToRemainingSeconds,
  formatTimeLeftTag,
  TIME_LEFT_COUNTER_THRESHOLD_S,
} from '../../../../utils/timeLeft'
import styles from './Step0Invite.module.css'

export interface Step0InviteProps {
  hopVariant?: HopVariant
  /**
   * Whole days remaining (demo / URL). Ignored when `endsAt` or `secondsLeft`
   * is set. Converted to an absolute deadline so the tag can live-tick under 48h.
   */
  daysLeft?: number
  /** Remaining seconds in the commit window. Prefer `endsAt` when available. */
  secondsLeft?: number
  /**
   * Absolute end of the commit window (unix ms or Date). Under 48h remaining
   * the tag becomes a live HH:MM:SS counter; at ≥ 48h it shows "N DAYS LEFT".
   */
  endsAt?: number | Date | null
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

function resolveEndMs(
  endsAt: number | Date | null | undefined,
  secondsLeft: number | undefined,
  daysLeft: number,
): number | null {
  if (endsAt != null) {
    return typeof endsAt === 'number' ? endsAt : endsAt.getTime()
  }
  if (secondsLeft != null && Number.isFinite(secondsLeft)) {
    return Date.now() + Math.max(0, secondsLeft) * 1000
  }
  if (Number.isFinite(daysLeft) && daysLeft > 0) {
    return Date.now() + daysLeft * 86400 * 1000
  }
  return null
}

function useTimeLeftTag(endMs: number | null): {
  label: string | null
  isLiveCounter: boolean
} {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (endMs == null) return
    if (endsAtToRemainingSeconds(endMs, Date.now()) <= 0) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [endMs])

  return useMemo(() => {
    if (endMs == null) return { label: null, isLiveCounter: false }
    const remaining = endsAtToRemainingSeconds(endMs, nowMs)
    return {
      label: formatTimeLeftTag(remaining),
      isLiveCounter:
        remaining > 0 && remaining < TIME_LEFT_COUNTER_THRESHOLD_S,
    }
  }, [endMs, nowMs])
}

export default function Step0Invite({
  hopVariant = 'hop-1',
  daysLeft = 3,
  secondsLeft,
  endsAt = null,
  onJoin,
  variant = 'default',
  className,
}: Step0InviteProps) {
  const isLanding = variant === 'landing'
  const endMs = useMemo(
    () => resolveEndMs(endsAt, secondsLeft, daysLeft),
    // Re-anchor only when the source countdown inputs change — not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Date.now() anchor for secondsLeft/daysLeft
    [endsAt, secondsLeft, daysLeft],
  )
  const { label: timeLeftLabel, isLiveCounter } = useTimeLeftTag(endMs)

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
        <div className={styles.top}>
          {timeLeftLabel != null ? (
            <div className={styles.meta}>
              <Tag
                label={timeLeftLabel}
                className={isLiveCounter ? styles.timeCounter : undefined}
              />
            </div>
          ) : null}
          <div className={styles.copy}>
            <h1 className={styles.headline}>You are invited to join the fleet</h1>
          </div>
        </div>
        <div className={[styles.footer, isLanding && styles.footerLanding].filter(Boolean).join(' ')}>
          <HopPill
            variant={hopVariant}
            className={hopPillStyles.landing}
          />
          <JoinButton onClick={onJoin} size="lg" />
        </div>
      </div>
    </div>
  )
}
