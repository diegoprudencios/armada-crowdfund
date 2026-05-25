import { useState } from 'react'
import styles from './Step2Commit.module.css'
import Steps from '../../Steps/Steps'
import { Button } from '../../Button'

interface Step2CommitProps {
  onNext: (amount: number) => void
  onBack: () => void
  maxAmount?: number
  availableBalance?: number
  maxArm?: number
}

const STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']

export default function Step2Commit({
  onNext,
  onBack,
  maxAmount = 4000,
  availableBalance = 215154.14,
  maxArm = 4000,
}: Step2CommitProps) {
  const [amount, setAmount] = useState<number>(0)

  const allocationRatio = Math.min(amount / maxAmount, 1)
  const estimatedArm = Math.round(allocationRatio * maxArm)
  const hasAmount = amount > 0

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''))
    if (isNaN(val)) {
      setAmount(0)
    } else {
      setAmount(Math.min(val, maxAmount))
    }
  }

  const formatBalance = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className={styles.shell}>
      <Steps steps={STEPS} currentStep={2} />

      <div className={styles.content}>
        <div className={styles.inputBlock}>
          <div className={styles.titleBlock}>
            {/* id used by aria-labelledby on the input */}
            <h2 className={styles.title} id="commit-title">How much USDC?</h2>
            <p className={styles.maxLabel} id="commit-max">
              Max {maxAmount.toLocaleString()}
            </p>
          </div>

          <label className={styles.amountWrapper} htmlFor="commit-amount">
            <span className={styles.visuallyHidden}>Amount in USDC</span>
            <input
              id="commit-amount"
              type="number"
              min={0}
              max={maxAmount}
              value={amount === 0 ? '' : amount}
              onChange={handleInput}
              placeholder="0"
              className={styles.amountInput}
              aria-labelledby="commit-title"
              aria-describedby="commit-max commit-available"
            />
          </label>

          <p
            className={styles.availableLabel}
            id="commit-available"
          >
            Available {formatBalance(availableBalance)}
          </p>
        </div>

        <div className={styles.allocationBlock}>
          <div
            className={styles.barTrack}
            role="progressbar"
            aria-valuenow={Math.round(allocationRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Committed amount progress"
          >
            <div
              className={styles.barFill}
              style={{ width: `${allocationRatio * 100}%` }}
            />
          </div>
          <div className={styles.allocationRow}>
            <div className={styles.allocationLeft}>
              <span className={styles.allocationLabel}>EST. ARM ALLOCATION</span>
              <div className={styles.infoIcon} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeOpacity="0.4"/>
                  <path d="M6 5.5V8.5M6 3.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className={styles.allocationRight}>
              <span className={hasAmount ? styles.allocationValueActive : styles.allocationValue}>
                {estimatedArm.toLocaleString()}
              </span>
              <span className={styles.allocationDivider} aria-hidden="true">/</span>
              <span className={styles.allocationMax}>{maxArm.toLocaleString()} ARM</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.buttonRow}>
        <Button
          variant="secondary"
          size="lg"
          label="Back"
          showIcon={false}
          onClick={onBack}
        />
        <Button
          variant="primary"
          size="lg"
          label="Review"
          showIcon={false}
          onClick={() => onNext(amount)}
          disabled={!hasAmount}
        />
      </div>
    </div>
  )
}
