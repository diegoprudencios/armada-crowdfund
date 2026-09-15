import { InformationCircleIcon } from '@heroicons/react/24/solid'
import Tooltip from '../Tooltip/Tooltip'
import styles from './ArmAllocationBlock.module.css'

export interface ArmAllocationBlockProps {
  /** Cap used for the commit progress bar (typically max USDC the user can commit). */
  maxArm: number
  newAmount: number
  existingCommittedUsdc?: number
  progressAriaLabel?: string
  tooltipDescription?: string
  tooltipBullets?: string[]
  /** When set, overrides the 1:1 existing+new ARM estimate. */
  estimatedArm?: number
}

const DEFAULT_BULLETS = [
  '1 ARM per 1 USDC',
  'Final allocation confirmed at close',
  'Subject to pool cap',
]

export function ArmAllocationBlock({
  maxArm,
  newAmount,
  existingCommittedUsdc = 0,
  progressAriaLabel = 'Committed amount progress',
  tooltipDescription = 'Your estimated allocation based on the amount entered.',
  tooltipBullets = DEFAULT_BULLETS,
  estimatedArm,
}: ArmAllocationBlockProps) {
  const existingRatio = maxArm > 0 ? Math.min(existingCommittedUsdc / maxArm, 1) : 0
  const newRatio = maxArm > 0 ? Math.min(newAmount / maxArm, 1) : 0
  const totalArm =
    estimatedArm !== undefined
      ? Math.round(estimatedArm)
      : Math.round(existingCommittedUsdc + newAmount)
  const hasExisting = existingCommittedUsdc > 0
  const hasNewAmount = newAmount > 0
  const valueActive = hasNewAmount || hasExisting
  const maxLabel = maxArm.toLocaleString('en-US')

  return (
    <div className={styles.block}>
      <div className={styles.barSection}>
        <div
          className={styles.barTrack}
          role="progressbar"
          aria-valuenow={Math.round((existingRatio + newRatio) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressAriaLabel}
        >
          {hasExisting ? (
            <div className={styles.barFillExisting} style={{ width: `${existingRatio * 100}%` }} />
          ) : null}
          {hasNewAmount ? (
            <div className={styles.barFillNew} style={{ width: `${newRatio * 100}%` }} />
          ) : null}
        </div>
        <div className={styles.barScale}>
          <span className={styles.barScaleMin}>0 USDC</span>
          <span className={styles.barScaleMax}>MAX {maxLabel} USDC</span>
        </div>
      </div>

      <div className={styles.armCard}>
        <div className={styles.left}>
          <span className={styles.label}>EST. ARM allocation</span>
          <Tooltip
            variant="rich"
            title="EST. ARM Allocation"
            description={tooltipDescription}
            bullets={tooltipBullets}
          >
            <button
              type="button"
              className={styles.infoTrigger}
              aria-label="Estimated ARM allocation details"
            >
              <InformationCircleIcon className={styles.infoIcon} aria-hidden />
            </button>
          </Tooltip>
        </div>
        <span className={valueActive ? styles.valueActive : styles.value}>
          {totalArm.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
