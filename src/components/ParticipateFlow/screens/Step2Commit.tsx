import { useState } from 'react'
import styles from './Step2Commit.module.css'
import Steps from '../../Steps/Steps'
import { Button } from '../../Button'
import { ArmAllocationBlock } from '../../ArmAllocationBlock/ArmAllocationBlock'
import type { ParticipateStepBarProps } from '../participateFlowSteps'
import {
  hasActiveAmount,
  parseActiveAmount,
  sanitizeAmountInput,
} from '../../../utils/amountInput'

interface Step2CommitProps extends ParticipateStepBarProps {
  onNext: (amount: number) => void
  onBack: () => void
  maxAmount?: number
  availableBalance?: number
  maxArm?: number
  /** Already committed USDC — bar shows this before new input. */
  existingCommittedUsdc?: number
  /** Prefill when returning from Review (parent-held amount). */
  initialAmount?: number
  /** Primary hop label for the bar — e.g. "Hop-0" → "Hop-0 commit". */
  hopLabel?: string
  showBack?: boolean
  /**
   * Current hop(s) already at cap. Shows “You're fully committed” instead of
   * the amount input (Max out banner may still sit above to unlock more).
   */
  fullyCommitted?: boolean
  /** Optional secondary CTA on the fully-committed card. */
  onViewPosition?: () => void
}

const DEFAULT_STEPS = ['Commit', 'Review', 'Confirm']

export default function Step2Commit({
  onNext,
  onBack,
  maxAmount = 4000,
  availableBalance = 215154.14,
  maxArm: _maxArm = 4000,
  existingCommittedUsdc = 0,
  initialAmount = 0,
  hopLabel = 'Hop-0',
  showBack = true,
  fullyCommitted = false,
  onViewPosition,
  steps = DEFAULT_STEPS,
  stepIndex = 1,
}: Step2CommitProps) {
  const remainingCap = Math.max(0, maxAmount - existingCommittedUsdc)
  const [amountInput, setAmountInput] = useState(() => {
    if (initialAmount <= 0) return ''
    const capped = Math.min(initialAmount, remainingCap)
    return hasActiveAmount(String(capped)) ? String(capped) : ''
  })

  const showActiveAmount = hasActiveAmount(amountInput)
  const amount = parseActiveAmount(amountInput, remainingCap)
  const hasNewAmount = amount > 0

  function handleInput(raw: string) {
    const next = sanitizeAmountInput(raw)
    if (!hasActiveAmount(next)) {
      setAmountInput('')
      return
    }
    if (next.endsWith('.')) {
      const val = parseFloat(next)
      if (!Number.isNaN(val) && val > remainingCap) {
        setAmountInput(String(remainingCap))
      } else {
        setAmountInput(next)
      }
      return
    }
    const val = parseFloat(next)
    if (Number.isNaN(val)) {
      setAmountInput('')
      return
    }
    const capped = Math.min(val, remainingCap)
    setAmountInput(hasActiveAmount(String(capped)) ? String(capped) : '')
  }

  const formatBalance = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (fullyCommitted) {
    return (
      <div className={styles.shell} data-flow-shell>
        <Steps steps={[...steps]} currentStep={stepIndex} />

        <div className={styles.content}>
          <div className={styles.inputBlock}>
            <div className={styles.fullyCommittedGroup}>
              <h2 className={styles.title}>You&apos;re fully committed</h2>
              <p className={styles.maxLabel}>
                You&apos;ve committed the maximum {maxAmount.toLocaleString('en-US')} USDC
                for {hopLabel}. Use Max out above to unlock more via self-invites.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.buttonRow}>
          {onViewPosition ? (
            <Button
              variant="secondary"
              size="lg"
              label="View your position"
              showIcon={false}
              onClick={onViewPosition}
            />
          ) : showBack ? (
            <Button variant="secondary" size="lg" label="Back" showIcon={false} onClick={onBack} />
          ) : (
            <Button variant="secondary" size="lg" label="Close" showIcon={false} onClick={onBack} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell} data-flow-shell>
      <Steps steps={[...steps]} currentStep={stepIndex} />

      <div className={styles.content}>
        <div className={styles.inputBlock}>
          <div className={styles.amountGroup}>
            <h2 className={styles.title} id="commit-title">
              How much USDC?
            </h2>

            <div className={styles.amountCluster}>
              <label className={styles.amountWrapper} htmlFor="commit-amount">
                <span className={styles.visuallyHidden}>Amount in USDC</span>
                <span
                  className={[styles.amountField, showActiveAmount && styles.amountFieldHasValue]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span
                    className={[styles.amountDisplay, showActiveAmount && styles.amountDisplayActive]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden="true"
                  >
                    {showActiveAmount ? amountInput : '0'}
                  </span>
                  <input
                    id="commit-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountInput}
                    onChange={(e) => handleInput(e.target.value)}
                    className={styles.amountInput}
                    aria-labelledby="commit-title"
                    aria-describedby="commit-balance"
                  />
                </span>
              </label>

              <p className={styles.balanceLabel} id="commit-balance">
                Balance {formatBalance(availableBalance)}
              </p>
            </div>
          </div>
        </div>

        <ArmAllocationBlock
          maxArm={maxAmount}
          newAmount={amount}
          existingCommittedUsdc={existingCommittedUsdc}
          estimatedArm={existingCommittedUsdc + amount}
          commitLabel={`${hopLabel} commit`}
          onFillMax={() => {
            if (remainingCap <= 0) return
            setAmountInput(String(remainingCap))
          }}
          progressAriaLabel="Committed amount toward your maximum"
          tooltipDescription="Your estimated allocation based on the amount committed."
          tooltipBullets={[
            '1 ARM per 1 USDC committed',
            'Final allocation confirmed at close',
            'Subject to pool cap',
          ]}
        />
      </div>

      <div className={styles.buttonRow}>
        {showBack && (
          <Button variant="secondary" size="lg" label="Back" showIcon={false} onClick={onBack} />
        )}
        <Button
          variant="primary"
          size="lg"
          label={hasNewAmount ? 'Review' : 'Insert amount'}
          showIcon={false}
          className={!hasNewAmount ? styles.ctaBlocked : undefined}
          aria-disabled={!hasNewAmount || undefined}
          onClick={() => {
            if (!hasNewAmount) return
            onNext(amount)
          }}
        />
      </div>
    </div>
  )
}
