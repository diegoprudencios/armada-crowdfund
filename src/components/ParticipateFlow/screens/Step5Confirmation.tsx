import styles from './Step5Confirmation.module.css'
import Steps from '../../Steps/Steps'
import { Button } from '../../Button'
import type { ParticipateStepBarProps } from '../participateFlowSteps'
import { WhatHappensNextSlider } from './WhatHappensNextSlider'

interface Step5ConfirmationProps extends ParticipateStepBarProps {
  /** When false (e.g. Hop-2 with no invite capacity), hide Invite and promote View position. */
  canInvite?: boolean
  onInvite?: () => void
  onViewPosition?: () => void
  /** Shown as secondary when `canInvite` is false. */
  onBackToCrowdfund?: () => void
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
  /** Commit-window countdown — forwarded to What happens next slide 1. */
  daysLeft?: number
  secondsLeft?: number
  endsAt?: number | Date | null
}

const DEFAULT_STEPS = ['Commit', 'Review', 'Confirm']

function formatUsd(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export default function Step5Confirmation({
  canInvite = true,
  onInvite,
  onViewPosition,
  onBackToCrowdfund,
  amount = 1000,
  estimatedArm = 1000,
  isAdditionalCommit = false,
  totalCommittedUsdc,
  maxedOut = false,
  daysLeft = 3,
  secondsLeft,
  endsAt = null,
  steps = DEFAULT_STEPS,
  stepIndex = 3,
  stepsStatus = 'confirmed',
}: Step5ConfirmationProps) {
  const formattedAmount = formatUsd(amount)
  const totalCommitted = totalCommittedUsdc ?? estimatedArm
  const formattedTotal = formatUsd(totalCommitted)
  // Maxed-out shortcut: no more invites from this screen (self-fill / at-cap).
  const showInvite = canInvite && !maxedOut && Boolean(onInvite)
  // Always show beside Invite when the parent provides a handler — first commit
  // and additional commit share the same secondary CTA.
  const shouldShowViewPosition = Boolean(onViewPosition)

  const headline = maxedOut
    ? "You're fully committed."
    : isAdditionalCommit
      ? 'Commitment updated.'
      : "You're in."
  const subline = maxedOut ? (
    <>
      You&apos;ve committed the maximum — {formattedTotal} USDC.
      <br />
      Up to {estimatedArm.toLocaleString()} ARM reserved for you.
    </>
  ) : isAdditionalCommit ? (
    <>
      {formattedAmount} added to your position.
      <br />
      {formattedTotal} USDC committed · up to {estimatedArm.toLocaleString()} ARM reserved.
    </>
  ) : (
    <>
      {formattedAmount} USDC committed.
      <br />
      Up to {estimatedArm.toLocaleString()} ARM reserved for you.
    </>
  )

  return (
    <div className={styles.shell} data-flow-shell>
      <Steps steps={[...steps]} currentStep={stepIndex} status={stepsStatus} />

      <div className={styles.content}>
        <div className={styles.heroBlock}>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.subline}>{subline}</p>
        </div>

        <WhatHappensNextSlider daysLeft={daysLeft} secondsLeft={secondsLeft} endsAt={endsAt} />
      </div>

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
  )
}
