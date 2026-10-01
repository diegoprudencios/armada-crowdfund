import { Fragment } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import styles from './Step5Confirmation.module.css'
import { FlowChrome } from '../FlowChrome'
import { Button } from '../../Button'
import type { ParticipateStepBarProps } from '../participateFlowSteps'
import { WhatHappensNextSlider } from './WhatHappensNextSlider'
import { UsefulLinks } from '../../UsefulLinks/UsefulLinks'

/** Demo explorer — Sepolia matches the committer’s public testnet. */
const DEMO_EXPLORER_BASE = 'https://sepolia.etherscan.io'

/** Stable demo commit tx so confirmation → explorer works without a live RPC. */
const DEMO_COMMIT_TX_HASH =
  '0x9f2e1d0c8b7a6958473625140f9e8d7c6b5a4938271605f4e3d2c1b0a99887766'

interface Step5ConfirmationProps extends ParticipateStepBarProps {
  /** When false (e.g. Hop-2 with no invite capacity), hide Invite and promote View position. */
  canInvite?: boolean
  onInvite?: () => void
  onViewPosition?: () => void
  /** Shown as secondary when `canInvite` is false. */
  onBackToCrowdfund?: () => void
  /** Close control in top chrome (preferred over modal-level X). */
  onClose?: () => void
  /** When true with `onViewPosition`, forces the secondary View CTA. Prefer
   *  always passing `onViewPosition` — the secondary shows whenever that
   *  callback is set (first and additional commits). */
  showViewPositionButton?: boolean
  amount?: number
  estimatedArm?: number
  /** User committed more USDC in a follow-up visit (not first participation). */
  isAdditionalCommit?: boolean
  totalCommittedUsdc?: number
  /** User was already at their maximum on entry — they didn't commit anything
   *  this visit. Swaps in "already fully committed" copy (no amount added). */
  maxedOut?: boolean
  /** Commit tx hash for explorer link. Demo hash used when omitted. */
  txHash?: string
  /** Block-explorer base URL (no trailing slash). Defaults to Sepolia Etherscan. */
  explorerBaseUrl?: string
  /** Commit-window countdown — forwarded to What happens next. */
  daysLeft?: number
  secondsLeft?: number
  endsAt?: number | Date | null
}

type SummaryRow = { label: string; value: string; accent?: boolean }

function formatUsd(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function truncateMiddle(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

function summaryRows(opts: {
  maxedOut: boolean
  isAdditionalCommit: boolean
  formattedAmount: string
  formattedTotal: string
  estimatedArm: number
}): SummaryRow[] {
  const { maxedOut, isAdditionalCommit, formattedAmount, formattedTotal, estimatedArm } = opts
  const armValue = `Up to ${estimatedArm.toLocaleString()} ARM`

  if (maxedOut) {
    return [
      { label: 'Committed', value: `${formattedTotal} USDC` },
      { label: 'EST. ARM reserved', value: armValue, accent: true },
    ]
  }

  if (isAdditionalCommit) {
    return [
      { label: 'Added', value: `${formattedAmount} USDC` },
      { label: 'Total committed', value: `${formattedTotal} USDC` },
      { label: 'EST. ARM reserved', value: armValue, accent: true },
    ]
  }

  return [
    { label: 'Committed', value: `${formattedAmount} USDC` },
    { label: 'EST. ARM reserved', value: armValue, accent: true },
  ]
}

export default function Step5Confirmation({
  canInvite = true,
  onInvite,
  onViewPosition,
  onBackToCrowdfund,
  onClose,
  amount = 1000,
  estimatedArm = 1000,
  isAdditionalCommit = false,
  totalCommittedUsdc,
  maxedOut = false,
  txHash = DEMO_COMMIT_TX_HASH,
  explorerBaseUrl = DEMO_EXPLORER_BASE,
  daysLeft = 3,
  secondsLeft,
  endsAt = null,
}: Step5ConfirmationProps) {
  const formattedAmount = formatUsd(amount)
  const totalCommitted = totalCommittedUsdc ?? estimatedArm
  const formattedTotal = formatUsd(totalCommitted)
  const showInvite = canInvite && !maxedOut && Boolean(onInvite)
  const shouldShowViewPosition = Boolean(onViewPosition)
  const showTxHash = !maxedOut && Boolean(txHash)

  const headline = maxedOut
    ? 'Already committed'
    : isAdditionalCommit
      ? 'Commit updated'
      : 'Commit successful'

  const subline = maxedOut
    ? 'You’re already fully committed for this hop. Below, find useful information for the next steps.'
    : isAdditionalCommit
      ? 'Welcome back, sailor. Below, find useful information for the next steps.'
      : 'Welcome on board, sailor. Below, find useful information for the next steps.'

  const rows = summaryRows({
    maxedOut,
    isAdditionalCommit,
    formattedAmount,
    formattedTotal,
    estimatedArm,
  })

  return (
    <div className={styles.shell} data-flow-shell>
      <div className={styles.chromeRow}>
        <FlowChrome
          showBack={false}
          titleAlign="start"
          titleId="step5-title"
          title={
            <>
              <CheckCircleIcon className={styles.checkIcon} aria-hidden />
              {headline}
            </>
          }
          onClose={onClose ?? onBackToCrowdfund}
          closeAriaLabel="Close participate flow"
        />
      </div>

      <div className={styles.contentWrap}>
        <div className={styles.content}>
          <p className={styles.subline}>{subline}</p>

          <div className={styles.summaryCard}>
            {rows.map((row, i) => (
              <Fragment key={row.label}>
                {i > 0 ? <div className={styles.divider} aria-hidden /> : null}
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>{row.label}</span>
                  <span
                    className={row.accent ? styles.summaryValueAccent : styles.summaryValue}
                  >
                    {row.value}
                  </span>
                </div>
              </Fragment>
            ))}
            {showTxHash ? (
              <>
                <div className={styles.divider} aria-hidden />
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Tx hash</span>
                  <a
                    className={styles.summaryValueLink}
                    href={`${explorerBaseUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={txHash}
                  >
                    {truncateMiddle(txHash)}
                    <span className={styles.visuallyHidden}> (opens in a new tab)</span>
                  </a>
                </div>
              </>
            ) : null}
          </div>

          <UsefulLinks headingId="step5-useful-links" />

          <WhatHappensNextSlider daysLeft={daysLeft} secondsLeft={secondsLeft} endsAt={endsAt} />
        </div>
        <div className={styles.contentFade} aria-hidden />
      </div>

      <div className={styles.footer}>
        <div className={styles.buttonRow}>
          {showInvite ? (
            <>
              {shouldShowViewPosition && onViewPosition && (
                <Button
                  variant="secondary"
                  size="lg"
                  label="View your position"
                  showIcon={false}
                  onClick={onViewPosition}
                />
              )}
              <Button
                variant="primary"
                size="lg"
                label="Whitelist a friend"
                showIcon={false}
                onClick={onInvite}
              />
            </>
          ) : (
            <>
              {onBackToCrowdfund && (
                <Button
                  variant="secondary"
                  size="lg"
                  label="Back to crowdfund"
                  showIcon={false}
                  onClick={onBackToCrowdfund}
                />
              )}
              {onViewPosition && (
                <Button
                  variant="primary"
                  size="lg"
                  label="View your position"
                  showIcon={false}
                  onClick={onViewPosition}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
