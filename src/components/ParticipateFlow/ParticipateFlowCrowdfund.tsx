import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import {
  availableForHop,
  type InviteAllowance,
  type InviteeHop,
} from '../MyPosition/inviteModel'
import { DEMO_INVITE_ALLOWANCE } from '../MyPosition/myPositionDemo'
import { hopPillDotColor } from '../../constants/graphHopColors'
import { Button } from '../Button'
import Step0Invite from './steps/Step0Invite/Step0Invite'
import Step2Commit from './screens/Step2Commit'
import Step3Review, { type Step3ReviewHopCommit } from './screens/Step3Review'
import Step4Approve from './screens/Step4Approve'
import Step5Confirmation from './screens/Step5Confirmation'
import { MaxOutBanner } from './screens/MaxOutBanner'
import maxOutStyles from './screens/MaxOutBanner.module.css'
import { ParticipateFlowModal } from './ParticipateFlowModal'
import { ParticipateFlowInviteSlots } from './ParticipateFlowInviteSlots'
import { CROWDFUND_MODAL_STEPS } from './participateFlowSteps'
import stepStyles from './ParticipateFlowStepTransition.module.css'
import type { DemoSelfFillPlan } from '../../lib/demoSelfFill'

const HOP_LABELS = ['HOP-0', 'HOP-1', 'HOP-2'] as const
const HOP_DOT_KEYS = ['seed', 'hop-1', 'hop-2'] as const

export interface ParticipateFlowCrowdfundProps {
  open: boolean
  onClose: (context: ParticipateFlowCloseContext) => void
  onViewPosition?: () => void
  /** @deprecated Wallet connect is RainbowKit; kept for callers. Ignored for step routing. */
  walletConnected?: boolean
  /** @deprecated Unused — connect happens outside this flow. */
  onConnectWallet?: (provider: string) => void
  onCompleteParticipation?: (amountUsdc: number) => void
  /** Apply POC-style self-fill (invites on self + multi-hop commits). */
  onApplyMaxOutPlan?: (plan: DemoSelfFillPlan) => void
  /** @deprecated Prefer onApplyMaxOutPlan. */
  onConsumeSelfInvites?: (inviteCount: number) => void
  hasParticipated?: boolean
  committedUsdc?: number
  /** Current-hop ceiling (no new self-invites) — Step2Commit MAX. */
  capUsdc?: number
  /** Remaining USDC on currently held hops. */
  remainingHopUsdc?: number
  /** Live self-fill plan from session (POC computeSelfFillPlan mirror). */
  maxOutPlan?: DemoSelfFillPlan | null
  hopVariant?: HopVariant
  daysLeft?: number
  slots?: SlotData[]
  inviteAllowance?: InviteAllowance
  onGenerateInviteLink?: (
    hop: InviteeHop,
  ) => Promise<{ id: number; link: string; expiresAt: Date } | void>
  onGenerateSlotLink?: (slotId: number) => Promise<void>
  onRevokeSlot?: (slotId: number) => void | Promise<void>
  onInviteOnchainHop?: (
    hop: InviteeHop,
    address: string,
    ensName?: string,
  ) => Promise<{ id: number; address: string; ensName?: string } | void>
  onInviteSlotOnchain?: (slotId: number, address: string, ensName?: string) => Promise<void>
  onCopySlotLink?: (slotId: number, link: string) => void
  loadingHop?: InviteeHop | null
  loadingSlotId?: number | null
  copiedSlotId?: number | null
}

export type CrowdfundFlowStep =
  | 'invite'
  | 'commit'
  | 'review'
  | 'approve'
  | 'confirmation'
  | 'invites'

export interface ParticipateFlowCloseContext {
  step: CrowdfundFlowStep
}

const HOP_LEVEL_LABEL: Record<HopVariant, string> = {
  seed: 'Hop-0',
  'hop-1': 'Hop-1',
  'hop-2': 'Hop-2',
  'multi-hop': 'Multi-hop',
}

const MODAL_STEPS = [...CROWDFUND_MODAL_STEPS]
const STEP_TRANSITION_MS = 240

const DIALOG_LABEL: Record<CrowdfundFlowStep, string> = {
  invite: 'You are invited to join the fleet',
  commit: 'How much USDC?',
  review: 'Review your commitment',
  approve: 'Confirm transactions on your wallet',
  confirmation: 'Participation confirmed',
  invites: 'Whitelist a friend',
}

function hopCommitRow(hop: 0 | 1 | 2, amount: number): Step3ReviewHopCommit {
  return {
    hop,
    hopLabel: HOP_LABELS[hop],
    hopColor: hopPillDotColor(HOP_DOT_KEYS[hop]),
    amount,
  }
}

function MaxOutReviewNote({ inviteCount }: { inviteCount: number }) {
  if (inviteCount > 0) {
    return (
      <>
        <strong>Self-invite bundle.</strong> Issues {inviteCount} self-invite
        {inviteCount === 1 ? '' : 's'} to unlock your full ceiling, then commits at every
        hop — all in one transaction. This spends your own invite slots on yourself, so
        they won&apos;t be available to invite others.
      </>
    )
  }
  return (
    <>
      <strong>Commit the maximum.</strong> Commits your full cap at every hop — all in one
      transaction.
    </>
  )
}

function initialStep(hasParticipated: boolean): CrowdfundFlowStep {
  if (hasParticipated) return 'commit'
  return 'invite'
}

function StepTransition({
  stepKey,
  fading,
  children,
}: {
  stepKey: string
  fading: boolean
  children: ReactNode
}) {
  return (
    <div
      key={stepKey}
      className={[stepStyles.frame, fading ? stepStyles.frameExit : stepStyles.frameEnter].join(' ')}
    >
      {children}
    </div>
  )
}

/**
 * Path 2 — crowdfund modal entry.
 * Commit MAX = current-hop ceiling; Max out = self-fill projected ceiling (POC parity).
 */
export function ParticipateFlowCrowdfund({
  open,
  onClose,
  onViewPosition,
  onCompleteParticipation,
  onApplyMaxOutPlan,
  onConsumeSelfInvites,
  hasParticipated = false,
  committedUsdc = 0,
  capUsdc = 15_000,
  remainingHopUsdc,
  maxOutPlan = null,
  hopVariant = 'seed',
  daysLeft = 3,
  slots = [],
  inviteAllowance = DEMO_INVITE_ALLOWANCE,
  onGenerateInviteLink,
  onGenerateSlotLink,
  onRevokeSlot,
  onInviteOnchainHop,
  onInviteSlotOnchain,
  onCopySlotLink,
  loadingHop = null,
  copiedSlotId = null,
}: ParticipateFlowCrowdfundProps) {
  const [step, setStep] = useState<CrowdfundFlowStep>(() => initialStep(hasParticipated))
  const [renderStep, setRenderStep] = useState<CrowdfundFlowStep>(() =>
    initialStep(hasParticipated),
  )
  const [fading, setFading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [maxMode, setMaxMode] = useState(false)
  const [activeMaxPlan, setActiveMaxPlan] = useState<DemoSelfFillPlan | null>(null)
  const [maxHopCommits, setMaxHopCommits] = useState<Step3ReviewHopCommit[] | null>(null)
  const [maxInviteCount, setMaxInviteCount] = useState(0)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasReturningParticipantRef = useRef(false)
  const wasOpenRef = useRef(false)

  const clearTransitionTimer = () => {
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current)
      transitionTimer.current = null
    }
  }

  const transitionTo = useCallback((next: CrowdfundFlowStep) => {
    clearTransitionTimer()
    setFading(true)
    transitionTimer.current = setTimeout(() => {
      setStep(next)
      setRenderStep(next)
      setFading(false)
      transitionTimer.current = null
    }, STEP_TRANSITION_MS)
  }, [])

  const resetMax = useCallback(() => {
    setMaxMode(false)
    setActiveMaxPlan(null)
    setMaxHopCommits(null)
    setMaxInviteCount(0)
  }, [])

  useEffect(() => {
    return () => clearTransitionTimer()
  }, [])

  const remainingCap =
    remainingHopUsdc != null ? remainingHopUsdc : Math.max(0, capUsdc - committedUsdc)

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open

    if (justOpened) {
      wasReturningParticipantRef.current = hasParticipated
      clearTransitionTimer()
      setFading(false)
      setAmount(0)
      resetMax()
      const atCurrentCap = hasParticipated && remainingCap <= 0
      const canSelfFill = (maxOutPlan?.newCommitUsdc ?? 0) > 0
      if (atCurrentCap && !canSelfFill) {
        setStep('confirmation')
        setRenderStep('confirmation')
      } else {
        const start = initialStep(hasParticipated)
        setStep(start)
        setRenderStep(start)
      }
      return
    }

    if (open) return

    clearTransitionTimer()
    const start = initialStep(hasParticipated)
    setStep(start)
    setRenderStep(start)
    setFading(false)
    setAmount(0)
    resetMax()
    wasReturningParticipantRef.current = false
  }, [open, hasParticipated, remainingCap, maxOutPlan?.newCommitUsdc, resetMax])

  const hopLevel = HOP_LEVEL_LABEL[hopVariant]
  const estimatedArm = Math.round(amount)
  const isFullyCommitted = hasParticipated && remainingCap <= 0
  const canSelfFill = (maxOutPlan?.newCommitUsdc ?? 0) > 0
  const availableInviteCount = useMemo(
    () =>
      availableForHop(slots, inviteAllowance, 1) +
      availableForHop(slots, inviteAllowance, 2),
    [slots, inviteAllowance],
  )

  // Banner when self-fill can unlock more (even if current hops are full).
  const showMaxOutBanner = renderStep === 'commit' && !maxMode && canSelfFill

  const stepBar = {
    steps: MODAL_STEPS,
  } as const

  const handleClose = useCallback(() => {
    onClose({ step })
  }, [onClose, step])

  const handleDemoMaxOut = useCallback(() => {
    if (!maxOutPlan || maxOutPlan.newCommitUsdc <= 0) return
    const hopCommits = maxOutPlan.commits.map((c) => hopCommitRow(c.hop, c.amount))
    setMaxMode(true)
    setActiveMaxPlan(maxOutPlan)
    setMaxHopCommits(hopCommits)
    setMaxInviteCount(maxOutPlan.totalInvites)
    setAmount(maxOutPlan.newCommitUsdc)
    transitionTo('review')
  }, [maxOutPlan, transitionTo])

  const finishCommit = useCallback(
    (commitAmount: number) => {
      if (maxMode && activeMaxPlan) {
        onApplyMaxOutPlan?.(activeMaxPlan)
        if (!onApplyMaxOutPlan) {
          onCompleteParticipation?.(commitAmount)
          onConsumeSelfInvites?.(activeMaxPlan.totalInvites)
        }
      } else {
        onCompleteParticipation?.(commitAmount)
      }
      resetMax()
      transitionTo('confirmation')
    },
    [
      maxMode,
      activeMaxPlan,
      onApplyMaxOutPlan,
      onCompleteParticipation,
      onConsumeSelfInvites,
      resetMax,
      transitionTo,
    ],
  )

  const renderConfirmation = (maxedOut: boolean) => (
    <Step5Confirmation
      {...stepBar}
      stepIndex={3}
      stepsStatus="confirmed"
      amount={maxedOut ? 0 : amount}
      estimatedArm={
        maxedOut
          ? Math.round(committedUsdc)
          : wasReturningParticipantRef.current
            ? committedUsdc + amount
            : estimatedArm
      }
      isAdditionalCommit={wasReturningParticipantRef.current && !maxedOut}
      totalCommittedUsdc={maxedOut ? committedUsdc : committedUsdc + amount}
      maxedOut={maxedOut}
      daysLeft={daysLeft}
      canInvite={availableInviteCount > 0}
      onViewPosition={onViewPosition}
      onBackToCrowdfund={handleClose}
      onInvite={() => transitionTo('invites')}
    />
  )

  const renderCurrentStep = () => {
    switch (renderStep) {
      case 'invite':
        return (
          <Step0Invite
            hopVariant={hopVariant}
            daysLeft={daysLeft}
            hideConnectEyebrow
            onJoin={() => transitionTo('commit')}
          />
        )

      case 'commit':
        // Current hops full — only skip to confirmation when self-fill also has nothing left.
        if (isFullyCommitted && !canSelfFill) {
          return renderConfirmation(true)
        }
        if (isFullyCommitted && canSelfFill) {
          return (
            <Step2Commit
              {...stepBar}
              stepIndex={1}
              existingCommittedUsdc={committedUsdc}
              maxAmount={capUsdc}
              hopLabel={hopLevel}
              fullyCommitted
              showBack={false}
              onBack={handleClose}
              onViewPosition={onViewPosition}
              onNext={() => {}}
            />
          )
        }
        return (
          <Step2Commit
            {...stepBar}
            stepIndex={1}
            existingCommittedUsdc={committedUsdc}
            maxAmount={capUsdc}
            initialAmount={amount}
            hopLabel={hopLevel}
            showBack={!hasParticipated}
            onBack={() => transitionTo('invite')}
            onNext={(nextAmount) => {
              resetMax()
              setAmount(nextAmount)
              transitionTo('review')
            }}
          />
        )

      case 'review':
        if (maxMode && maxHopCommits) {
          return (
            <Step3Review
              {...stepBar}
              stepIndex={2}
              hopCommits={maxHopCommits.length > 1 ? maxHopCommits : undefined}
              hopLevel={
                maxHopCommits.length === 1
                  ? HOP_LABELS[maxHopCommits[0]!.hop]
                  : hopLevel
              }
              amount={amount}
              estimatedArm={estimatedArm}
              note={<MaxOutReviewNote inviteCount={maxInviteCount} />}
              onBack={() => {
                resetMax()
                transitionTo('commit')
              }}
              onNext={() => transitionTo('approve')}
            />
          )
        }
        return (
          <Step3Review
            {...stepBar}
            stepIndex={2}
            hopLevel={hopLevel}
            amount={amount}
            estimatedArm={estimatedArm}
            onBack={() => transitionTo('commit')}
            onNext={() => transitionTo('approve')}
          />
        )

      case 'approve':
        return (
          <Step4Approve
            {...stepBar}
            stepIndex={3}
            amount={amount}
            onDone={() => finishCommit(amount)}
          />
        )

      case 'confirmation':
        return renderConfirmation(isFullyCommitted && amount === 0 && !canSelfFill)

      case 'invites':
        return (
          <ParticipateFlowInviteSlots
            slots={slots}
            allowance={inviteAllowance}
            onGenerateLink={
              onGenerateInviteLink ??
              (async (hop) => {
                await onGenerateSlotLink?.(hop === 2 ? 2 : 1)
              })
            }
            onCopy={onCopySlotLink ?? (() => {})}
            onRevoke={onRevokeSlot ?? (() => {})}
            onInviteOnchain={
              onInviteOnchainHop ??
              (async (hop, address, ensName) => {
                await onInviteSlotOnchain?.(hop === 2 ? 2 : 1, address, ensName)
              })
            }
            onDoItLater={handleClose}
            copiedId={copiedSlotId}
            loadingHop={loadingHop}
          />
        )

      default:
        return null
    }
  }

  return (
    <ParticipateFlowModal
      open={open}
      onClose={handleClose}
      ariaLabel={DIALOG_LABEL[step]}
      showClose={step === 'confirmation' || step === 'invites'}
      footer={
        step === 'invite' ? (
          <Button
            variant="ghost"
            size="md"
            label="Do it later"
            showIcon={false}
            onClick={handleClose}
          />
        ) : null
      }
    >
      <div className={maxOutStyles.stack}>
        {showMaxOutBanner && maxOutPlan ? (
          <MaxOutBanner
            maxOut={{
              ceilingUsd: maxOutPlan.projectedCeilingUsdc,
              newCommitUsd: maxOutPlan.newCommitUsdc,
              inviteCount: maxOutPlan.totalInvites,
              onMaxOut: handleDemoMaxOut,
            }}
          />
        ) : null}
        <StepTransition stepKey={renderStep} fading={fading}>
          {renderCurrentStep()}
        </StepTransition>
      </div>
    </ParticipateFlowModal>
  )
}
