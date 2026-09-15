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
  /** Path 1 invite link — always show View your position beside Invite. */
  showViewPositionButton?: boolean
  amount?: number
  estimatedArm?: number
  /** User committed more USDC in a follow-up visit (not first participation). */
  isAdditionalCommit?: boolean
  totalCommittedUsdc?: number
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
  showViewPositionButton = false,
  amount = 1000,
  estimatedArm = 1000,
  isAdditionalCommit = false,
  totalCommittedUsdc,
  steps = DEFAULT_STEPS,
  stepIndex = 3,
  stepsStatus = 'confirmed',
}: Step5ConfirmationProps) {
  const formattedAmount = formatUsd(amount)
  const totalCommitted = totalCommittedUsdc ?? estimatedArm
  const formattedTotal = formatUsd(totalCommitted)
  const shouldShowViewPosition =
    Boolean(onViewPosition) &&
    (showViewPositionButton || isAdditionalCommit || !canInvite)

  const headline = isAdditionalCommit ? 'Commitment updated.' : "You're in."
  const subline = isAdditionalCommit ? (
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

        <WhatHappensNextSlider />
      </div>

      <div className={styles.buttonRow}>
        {canInvite ? (
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
            {onInvite && (
              <Button
                variant="primary"
                size="lg"
                label="Whitelist a friend"
                showIcon={false}
                onClick={onInvite}
              />
            )}
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
