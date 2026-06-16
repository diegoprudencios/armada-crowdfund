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
  showBack?: boolean
}

const DEFAULT_STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']

export default function Step2Commit({
  onNext,
  onBack,
  maxAmount = 4000,
  availableBalance = 215154.14,
  maxArm = 4000,
  existingCommittedUsdc = 0,
  showBack = true,
  steps = DEFAULT_STEPS,
  stepIndex = 2,
}: Step2CommitProps) {
  const [amountInput, setAmountInput] = useState('')

  const remainingCap = Math.max(0, maxAmount - existingCommittedUsdc)
  const showActiveAmount = hasActiveAmount(amountInput)
  const amount = parseActiveAmount(amountInput, remainingCap)
  const hasNewAmount = amount > 0
  const hasExisting = existingCommittedUsdc > 0

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

  return (
    <div className={styles.shell} data-flow-shell>
      <Steps steps={[...steps]} currentStep={stepIndex} />

      <div className={styles.content}>
        <div className={styles.inputBlock}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title} id="commit-title">How much USDC?</h2>
            <p className={styles.maxLabel} id="commit-max">
              {hasExisting
                ? `${remainingCap.toLocaleString()} remaining · ${maxAmount.toLocaleString()} cap`
                : `Max ${maxAmount.toLocaleString()}`}
            </p>
          </div>

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
                aria-describedby="commit-max commit-available"
              />
            </span>
          </label>
        </div>

        <div className={styles.allocationSection}>
          <p className={styles.availableLabel} id="commit-available">
            Available {formatBalance(availableBalance)}
          </p>
          <ArmAllocationBlock
            maxArm={maxArm}
            newAmount={amount}
            existingCommittedUsdc={existingCommittedUsdc}
            progressAriaLabel="Committed amount progress"
            tooltipDescription="Your estimated allocation based on the amount committed."
            tooltipBullets={[
              '1 ARM per 1 USDC committed',
              'Final allocation confirmed at close',
              'Subject to pool cap',
            ]}
          />
        </div>
      </div>

      <div className={styles.buttonRow}>
        {showBack && (
          <Button variant="secondary" size="lg" label="Back" showIcon={false} onClick={onBack} />
        )}
        <Button
          variant="primary"
          size="lg"
          label="Review"
          showIcon={false}
          onClick={() => onNext(amount)}
          disabled={!hasNewAmount}
        />
      </div>
    </div>
  )
}
