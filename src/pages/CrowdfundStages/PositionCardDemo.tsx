import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '../../components/Button'
import { Tag } from '../../components/Tag'
import Tooltip from '../../components/Tooltip/Tooltip'
import {
  formatArmAllocation,
  formatUsdcCommitted,
} from '../../components/MyPosition/myPositionDemo'
import styles from '../../components/MyPosition/MyPositionHero.module.css'

export type PositionCardDemoVariant =
  | 'open-no-commit'
  | 'open-committed'
  | 'closed-committed'
  | 'finalized-arm'
  | 'finalized-refund'
  | 'claimed'

export interface PositionCardDemoProps {
  variant: PositionCardDemoVariant
  onCta?: () => void
  /** Finalized pending-claim cards — opens claim flow. */
  onClaim?: () => void
  className?: string
}

const WALLET = '0X9841...406A'
const HOP = 'HOP-0'

type DemoConfig = {
  windowOpen: boolean
  hasCommitted: boolean
  committedUsd: number
  fillPct: number
  capUsd: number
  outcome: 'arm' | 'refund'
  allocation: number
  showHop?: boolean
  claimed?: boolean
  /** Finalized + unclaimed — show solid purple Claim CTA. */
  claimable?: boolean
}

const CONFIG: Record<PositionCardDemoVariant, DemoConfig> = {
  'open-no-commit': {
    windowOpen: true,
    hasCommitted: false,
    committedUsd: 0,
    fillPct: 0,
    capUsd: 50,
    outcome: 'arm',
    allocation: 0,
    showHop: false,
  },
  'open-committed': {
    windowOpen: true,
    hasCommitted: true,
    committedUsd: 10,
    fillPct: 20,
    capUsd: 50,
    outcome: 'arm',
    allocation: 10,
    showHop: true,
  },
  'closed-committed': {
    windowOpen: false,
    hasCommitted: true,
    committedUsd: 10,
    fillPct: 20,
    capUsd: 50,
    outcome: 'arm',
    allocation: 10,
    showHop: true,
  },
  'finalized-arm': {
    windowOpen: false,
    hasCommitted: true,
    committedUsd: 10,
    fillPct: 20,
    capUsd: 50,
    outcome: 'arm',
    allocation: 10,
    showHop: true,
    claimable: true,
  },
  'finalized-refund': {
    windowOpen: false,
    hasCommitted: true,
    committedUsd: 10,
    fillPct: 20,
    capUsd: 50,
    outcome: 'refund',
    allocation: 10,
    showHop: true,
    claimable: true,
  },
  claimed: {
    windowOpen: false,
    hasCommitted: true,
    committedUsd: 10,
    fillPct: 20,
    capUsd: 50,
    outcome: 'arm',
    allocation: 10,
    showHop: true,
    claimed: true,
  },
}

export function PositionCardDemo({ variant, onCta, onClaim, className }: PositionCardDemoProps) {
  const cfg = CONFIG[variant]
  const showParticipateCta = cfg.windowOpen && onCta
  const showClaimCta = cfg.claimable && onClaim

  return (
    <section
      className={[styles.positionCard, className].filter(Boolean).join(' ')}
      aria-label="Your position"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleRow}>
          <h2 className={styles.pageTitle}>My Position</h2>
          {showParticipateCta && (
            <Button
              className={styles.headerCta}
              variant="gradient"
              size="sm"
              label={cfg.hasCommitted ? 'Commit again' : 'Participate'}
              showIcon
              icon="arrow-right-micro"
              onClick={onCta}
            />
          )}
          {showClaimCta && (
            <Button
              className={styles.headerCta}
              variant="primary"
              size="sm"
              label={cfg.outcome === 'refund' ? 'Claim refund' : 'Claim'}
              showIcon={false}
              onClick={onClaim}
            />
          )}
        </div>
        <div className={styles.metaTags}>
          <Tag label={WALLET} dot="lavender" />
          {cfg.showHop && <Tag label={HOP} dot="lavender" />}
          {cfg.claimed && <Tag label="CLAIMED" dot="active" />}
        </div>
      </div>

      <div className={styles.positionFooter}>
        <div className={styles.statsRow}>
          <div className={styles.statBlock}>
            <p className={styles.statLabel}>USDC committed</p>
            <p className={styles.statAmount}>{formatUsdcCommitted(cfg.committedUsd)}</p>
          </div>

          {cfg.outcome === 'refund' ? (
            <div className={styles.statBlock}>
              <div className={styles.statLabelRow}>
                <p className={styles.statLabel}>USDC refund</p>
                <Tooltip
                  variant="centered"
                  content="Available for claim. Your committed USDC will be returned to your wallet."
                >
                  <button
                    type="button"
                    className={styles.infoTrigger}
                    aria-label="USDC refund info"
                  >
                    <InformationCircleIcon className={styles.infoIcon} aria-hidden />
                  </button>
                </Tooltip>
              </div>
              <p className={styles.statAmountAccent}>
                {formatUsdcCommitted(cfg.allocation)}
              </p>
            </div>
          ) : (
            <div className={styles.statBlock}>
              <div className={styles.statLabelRow}>
                <p className={styles.statLabel}>ARM allocation</p>
                <Tooltip
                  variant="centered"
                  content={
                    cfg.claimed
                      ? 'Claimed · in your wallet'
                      : cfg.hasCommitted
                        ? 'Estimated · pending finalization'
                        : 'Estimated · commit USDC to receive an allocation'
                  }
                >
                  <button
                    type="button"
                    className={styles.infoTrigger}
                    aria-label="ARM allocation info"
                  >
                    <InformationCircleIcon className={styles.infoIcon} aria-hidden />
                  </button>
                </Tooltip>
              </div>
              <p className={styles.statAmountAccent}>
                {formatArmAllocation(cfg.allocation)}
              </p>
            </div>
          )}
        </div>

        <div className={styles.barSection}>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${cfg.fillPct}%` }} />
          </div>
          <div className={styles.barLabels}>
            <span className={styles.barCaption}>{Math.round(cfg.fillPct)}% of cap</span>
            <span className={styles.barCaption}>Cap {formatUsdcCommitted(cfg.capUsd)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
