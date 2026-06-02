import { InformationCircleIcon } from '@heroicons/react/24/solid'
import Tooltip from '../Tooltip/Tooltip'
import styles from './ArmAllocationBlock.module.css'

export interface ArmAllocationBlockProps {
  maxArm: number
  newAmount: number
  existingCommittedUsdc?: number
  progressAriaLabel?: string
  tooltipDescription?: string
  tooltipBullets?: string[]
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
  progressAriaLabel = 'Estimated ARM allocation progress',
  tooltipDescription = 'Your estimated allocation based on the amount entered.',
  tooltipBullets = DEFAULT_BULLETS,
}: ArmAllocationBlockProps) {
  const existingRatio = maxArm > 0 ? Math.min(existingCommittedUsdc / maxArm, 1) : 0
  const newRatio = maxArm > 0 ? Math.min(newAmount / maxArm, 1) : 0
  const totalArm = Math.round(existingCommittedUsdc + newAmount)
  const hasExisting = existingCommittedUsdc > 0
  const hasNewAmount = newAmount > 0
  const valueActive = hasNewAmount || hasExisting

  return (
    <div className={styles.block}>
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
      <div className={styles.row}>
        <div className={styles.left}>
          <span className={styles.label}>EST. ARM ALLOCATION</span>
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
        <div className={styles.right}>
          <span className={valueActive ? styles.valueActive : styles.value}>
            {totalArm.toLocaleString()}
          </span>
          <span className={styles.divider} aria-hidden="true">
            /
          </span>
          <span className={styles.max}>{maxArm.toLocaleString()} ARM</span>
        </div>
      </div>
    </div>
  )
}
