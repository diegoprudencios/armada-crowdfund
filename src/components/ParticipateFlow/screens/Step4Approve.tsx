// ABOUTME: Confirm approve + commit txs — FlowChrome + WalletConfirmStep.
// ABOUTME: Showcase auto-animates success; pass `txs` to drive real/error states.

import { useEffect, useState } from 'react'
import styles from './Step4Approve.module.css'
import { FlowChrome } from '../FlowChrome'
import type { ParticipateStepBarProps } from '../participateFlowSteps'
import {
  WalletConfirmStep,
  type WalletTransactionItem,
} from '../../WalletConfirm'

export type { WalletTransactionItem as Step4ApproveTransaction }

export interface Step4ApproveProps extends ParticipateStepBarProps {
  onDone: () => void
  onClose?: () => void
  /** Returns to Review (chrome back, or error footer Back). */
  onBack?: () => void
  /** Re-run the pipeline when a tx row errored. */
  onRetry?: () => void
  amount?: number
  /**
   * Controlled transactions. When set, the consumer drives status (including
   * `error`) and decides when to call `onDone`.
   */
  txs?: readonly WalletTransactionItem[]
  /**
   * Design/demo auto-animation (approve → commit → onDone). Omit or false when
   * driving `txs` from a real flow.
   */
  showcase?: boolean
}

export default function Step4Approve({
  onDone,
  onClose,
  onBack,
  onRetry,
  amount = 1000,
  txs: controlledTxs,
  showcase = false,
}: Step4ApproveProps) {
  const [internalTxs, setInternalTxs] = useState<WalletTransactionItem[]>([
    { label: `Approve ${amount.toLocaleString()} USDC`, status: 'loading' },
    { label: 'Commit participation', status: 'pending' },
  ])

  useEffect(() => {
    if (!showcase || controlledTxs) return
    const t1 = setTimeout(() => {
      setInternalTxs([
        { label: `Approve ${amount.toLocaleString()} USDC`, status: 'done' },
        { label: 'Commit participation', status: 'loading' },
      ])
    }, 2000)
    const t2 = setTimeout(() => {
      setInternalTxs([
        { label: `Approve ${amount.toLocaleString()} USDC`, status: 'done' },
        { label: 'Commit participation', status: 'done' },
      ])
      setTimeout(onDone, 400)
    }, 4000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [amount, onDone, showcase, controlledTxs])

  const txs: readonly WalletTransactionItem[] =
    controlledTxs ??
    (showcase
      ? internalTxs
      : [{ label: 'Preparing transaction…', status: 'loading' }])

  const hasError = txs.some((t) => t.status === 'error')

  return (
    <div className={styles.shell} data-flow-shell>
      <FlowChrome
        title="Confirm"
        showBack={!!onBack && !hasError}
        onBack={onBack}
        onClose={onClose}
      />

      <WalletConfirmStep
        transactions={txs}
        onBack={hasError ? onBack : undefined}
        onRetry={hasError ? onRetry : undefined}
        footerText={
          hasError
            ? 'Transaction failed. Go back to retry.'
            : showcase || controlledTxs
              ? 'Waiting for wallet confirmation'
              : 'Preparing transaction…'
        }
      />
    </div>
  )
}
