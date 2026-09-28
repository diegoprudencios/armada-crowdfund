// ABOUTME: Confirmation “What happens next” carousel — scenarios after commit (window, under/over, refund, claim).
// ABOUTME: Manual navigation via chevrons only (no dots / autoplay). Slide 1 embeds a live window countdown.

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  endsAtToRemainingSeconds,
  formatTimeLeft,
  TIME_LEFT_COUNTER_THRESHOLD_S,
} from '../../../utils/timeLeft'
import styles from './WhatHappensNextSlider.module.css'

export interface WhatHappensNextSliderProps {
  /**
   * Whole days remaining (demo / URL). Ignored when `endsAt` or `secondsLeft`
   * is set. Converted to an absolute deadline so the copy can live-tick under 48h.
   */
  daysLeft?: number
  /** Remaining seconds in the commit window. Prefer `endsAt` when available. */
  secondsLeft?: number
  /** Absolute end of the commit window (unix ms or Date). */
  endsAt?: number | Date | null
}

type Slide = { id: string; title: string; body: string }

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

function windowOpenBody(remainingLabel: string | null): string {
  if (remainingLabel) {
    return `The commitment window closes in ${remainingLabel}. Your USDC will be locked until then.`
  }
  return 'The commitment window is closing. Your USDC will be locked until then.'
}

const STATIC_SLIDES: ReadonlyArray<Omit<Slide, 'body'> & { body?: string }> = [
  {
    id: 'window',
    title: '1. While the window is open',
  },
  {
    id: 'under',
    title: '2. If undersubscribed',
    body: 'If total demand misses the minimum raise, the sale refunds. You reclaim your full USDC — no ARM is issued.',
  },
  {
    id: 'over',
    title: '3. If oversubscribed',
    body: 'If demand exceeds supply, ARM is allocated pro-rata. You may receive less than “up to” your estimate; unused USDC is refunded when you claim.',
  },
  {
    id: 'refund',
    title: '4. If the sale refunds after allocation',
    body: 'Sometimes demand qualifies but net proceeds still fall short. In that case everyone can reclaim their full USDC — no ARM is issued.',
  },
  {
    id: 'claim',
    title: '5. Claim & delegate',
    body: 'After a successful finalization, claim your ARM and choose a delegate in one step. Any refund USDC comes back in the same flow.',
  },
]

export function WhatHappensNextSlider({
  daysLeft = 3,
  secondsLeft,
  endsAt = null,
}: WhatHappensNextSliderProps) {
  const labelId = useId()
  const [index, setIndex] = useState(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const endMs = useMemo(
    () => resolveEndMs(endsAt, secondsLeft, daysLeft),
    // Re-anchor only when the source countdown inputs change — not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Date.now() anchor for secondsLeft/daysLeft
    [endsAt, secondsLeft, daysLeft],
  )

  useEffect(() => {
    if (endMs == null) return
    if (endsAtToRemainingSeconds(endMs, Date.now()) <= 0) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [endMs])

  const remainingLabel = useMemo(() => {
    if (endMs == null) return null
    const remaining = endsAtToRemainingSeconds(endMs, nowMs)
    const label = formatTimeLeft(remaining)
    return label || null
  }, [endMs, nowMs])

  const isLiveCounter = useMemo(() => {
    if (endMs == null) return false
    const remaining = endsAtToRemainingSeconds(endMs, nowMs)
    return remaining > 0 && remaining < TIME_LEFT_COUNTER_THRESHOLD_S
  }, [endMs, nowMs])

  const slides: ReadonlyArray<Slide> = useMemo(
    () =>
      STATIC_SLIDES.map((slide) =>
        slide.id === 'window'
          ? { id: slide.id, title: slide.title, body: windowOpenBody(remainingLabel) }
          : { id: slide.id, title: slide.title, body: slide.body! },
      ),
    [remainingLabel],
  )

  const count = slides.length
  const slide = slides[index]!
  // Avoid announcing HH:MM:SS every second; still announce when the slide changes.
  const slideLive =
    slide.id === 'window' && isLiveCounter ? ('off' as const) : ('polite' as const)

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  const goPrev = useCallback(() => go(index - 1), [go, index])
  const goNext = useCallback(() => go(index + 1), [go, index])

  return (
    <div
      className={styles.root}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <div className={styles.header}>
        <span id={labelId} className={styles.eyebrow}>
          WHAT HAPPENS NEXT
        </span>
        <div className={styles.chevronGroup}>
          <button
            type="button"
            className={styles.chevronBtn}
            aria-label="Previous slide"
            onClick={goPrev}
          >
            <ChevronLeftIcon className={styles.chevronIcon} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.chevronBtn}
            aria-label="Next slide"
            onClick={goNext}
          >
            <ChevronRightIcon className={styles.chevronIcon} aria-hidden />
          </button>
        </div>
      </div>

      <div
        className={styles.slide}
        aria-live={slideLive}
        aria-atomic="true"
        key={slide.id}
      >
        <p className={styles.slideTitle}>{slide.title}</p>
        <p className={styles.slideBody}>{slide.body}</p>
      </div>
    </div>
  )
}
