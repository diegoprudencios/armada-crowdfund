import { useEffect, useState, useRef } from 'react'
import styles from './Step4Approve.module.css'
import Steps from '../../Steps/Steps'
import type { ParticipateStepBarProps } from '../participateFlowSteps'
interface Transaction {
  label: string
  status: 'pending' | 'loading' | 'done'
}

interface Step4ApproveProps extends ParticipateStepBarProps {
  onDone: () => void
  amount?: number
}

const DEFAULT_STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']

const STATUS_LABEL: Record<Transaction['status'], string> = {
  loading: 'Loading',
  pending: 'Pending',
  done: 'Complete',
}

export default function Step4Approve({
  onDone,
  amount = 1000,
  steps = DEFAULT_STEPS,
  stepIndex = 4,
}: Step4ApproveProps) {
  const [txs, setTxs] = useState<Transaction[]>([
    { label: `Approve ${amount.toLocaleString()} USDC`, status: 'loading' },
    { label: 'Commit participation', status: 'pending' },
  ])
  const liveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t1 = setTimeout(() => {
      setTxs([
        { label: `Approve ${amount.toLocaleString()} USDC`, status: 'done' },
        { label: 'Commit participation', status: 'loading' },
      ])
    }, 2000)
    const t2 = setTimeout(() => {
      setTxs([
        { label: `Approve ${amount.toLocaleString()} USDC`, status: 'done' },
        { label: 'Commit participation', status: 'done' },
      ])
      setTimeout(onDone, 400)
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [amount, onDone])

  return (
    <div className={styles.shell}>
      <Steps steps={[...steps]} currentStep={stepIndex} />

      <div className={styles.content}>
        <h2 className={styles.title}>
          Confirm transactions<br />on your wallet
        </h2>

        {/* aria-live announces status changes to screen readers */}
        <div
          className={styles.txCard}
          aria-live="polite"
          aria-label="Transaction status"
          ref={liveRef}
        >
          {txs.map((tx, i) => (
            <div key={i} role="listitem">
              {i > 0 && <div className={styles.divider} aria-hidden="true" />}
              <div className={styles.txRow}>
                <span className={styles.txLabel}>{tx.label}</span>
                <div
                  className={styles.txStatus}
                  aria-label={STATUS_LABEL[tx.status]}
                >
                  {tx.status === 'loading' && (
                    <div
                      className={styles.spinner}
                      role="status"
                      aria-label="Loading"
                    />
                  )}
                  {tx.status === 'pending' && (
                    <div className={styles.circle} aria-hidden="true" />
                  )}
                  {tx.status === 'done' && (
                    <div className={styles.check} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {/* Visually hidden status text for AT */}
                  <span className={styles.visuallyHidden}>
                    {STATUS_LABEL[tx.status]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <p
          className={styles.footerText}
          aria-live="polite"
          aria-atomic="true"
        >
          Waiting for wallet confirmation
        </p>
      </div>
    </div>
  )
}
