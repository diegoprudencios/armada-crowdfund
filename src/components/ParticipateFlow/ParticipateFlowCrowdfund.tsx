import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import { hopPillDotColor } from '../../constants/graphHopColors'
import { CAP } from '../MyPosition/myPositionDemo'
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

/**
 * Per-hop demo slice used when illustrating a multi-hop max-out review.
 * Position ceiling is `CAP` (My Position) — max-out always fills to that.
 */
const DEMO_HOP_SLICE_USDC = 4_000

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
  /** After a self-fill max-out, spend this many empty invite slots on yourself. */
  onConsumeSelfInvites?: (inviteCount: number) => void
  hasParticipated?: boolean
  committedUsdc?: number
  /** Position ceiling — defaults to My Position `CAP`. */
  capUsdc?: number
  hopVariant?: HopVariant
  daysLeft?: number
  slots?: SlotData[]
  onGenerateSlotLink?: (slotId: number) => Promise<void>
  onRevokeSlot?: (slotId: number) => void
  onInviteSlotOnchain?: (slotId: number, address: string, ensName?: string) => Promise<void>
  onCopySlotLink?: (slotId: number, link: string) => void
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
  'hop-1': 'Hop 1',
  'hop-2': 'Hop 2',
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

function hopIndexFromVariant(variant: HopVariant): 0 | 1 | 2 {
  if (variant === 'seed') return 0
  if (variant === 'hop-2') return 2
  return 1
}

function hopCommitRow(hop: 0 | 1 | 2, amount: number): Step3ReviewHopCommit {
  return {
    hop,
    hopLabel: HOP_LABELS[hop],
    hopColor: hopPillDotColor(HOP_DOT_KEYS[hop]),
    amount,
  }
}

/**
 * Demo self-fill plan — always totals exactly `newCommitUsd` (fills to position CAP).
 * Multi-hop rows are illustrative; inviteCount drives the review note only.
 */
function buildDemoMaxPlan(opts: {
  hopVariant: HopVariant
  inviteCount: number
  newCommitUsd: number
}): { hopCommits: Step3ReviewHopCommit[]; inviteCount: number; newCommitUsd: number } {
  const { hopVariant, inviteCount, newCommitUsd } = opts
  const primary = hopIndexFromVariant(hopVariant)

  if (newCommitUsd <= 0) {
    return { hopCommits: [hopCommitRow(primary, 0)], inviteCount: 0, newCommitUsd: 0 }
  }

  if (inviteCount <= 0) {
    return {
      hopCommits: [hopCommitRow(primary, newCommitUsd)],
      inviteCount: 0,
      newCommitUsd,
    }
  }

  const hops: Array<0 | 1 | 2> = [primary]
  for (let i = 1; i <= inviteCount; i++) {
    const next = primary + i
    if (next > 2) break
    hops.push(next as 0 | 1 | 2)
  }

  const hopCommits: Step3ReviewHopCommit[] = []
  let remaining = newCommitUsd
  hops.forEach((hop, index) => {
    if (remaining <= 0) return
    const preferred =
      index === 0
        ? Math.min(DEMO_HOP_SLICE_USDC, remaining)
        : index === hops.length - 1
          ? remaining
          : Math.min(DEMO_HOP_SLICE_USDC, remaining)
    hopCommits.push(hopCommitRow(hop, preferred))
    remaining -= preferred
  })

  if (remaining > 0 && hopCommits.length > 0) {
    const last = hopCommits[hopCommits.length - 1]!
    hopCommits[hopCommits.length - 1] = { ...last, amount: last.amount + remaining }
  }

  const total = hopCommits.reduce((sum, c) => sum + c.amount, 0)
  return { hopCommits, inviteCount, newCommitUsd: total }
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
 * Wallet connect is RainbowKit (outside this flow). Progress: Commit → Review → Confirm.
 * Max-out fills to the My Position ceiling (`capUsdc` / CAP), matching committer self-fill.
 */
export function ParticipateFlowCrowdfund({
  open,
  onClose,
  onViewPosition,
  onCompleteParticipation,
  onConsumeSelfInvites,
  hasParticipated = false,
  committedUsdc = 0,
  capUsdc = CAP,
  hopVariant = 'hop-1',
  daysLeft = 3,
  slots = [],
  onGenerateSlotLink,
  onRevokeSlot,
  onInviteSlotOnchain,
  onCopySlotLink,
  loadingSlotId = null,
  copiedSlotId = null,
}: ParticipateFlowCrowdfundProps) {
  const [step, setStep] = useState<CrowdfundFlowStep>(() => initialStep(hasParticipated))
  const [renderStep, setRenderStep] = useState<CrowdfundFlowStep>(() =>
    initialStep(hasParticipated),
  )
  const [fading, setFading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [maxMode, setMaxMode] = useState(false)
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
    setMaxHopCommits(null)
    setMaxInviteCount(0)
  }, [])

  useEffect(() => {
    return () => clearTransitionTimer()
  }, [])

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open

    if (justOpened) {
      wasReturningParticipantRef.current = hasParticipated
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
  }, [open, hasParticipated, resetMax])

  const hopLevel = HOP_LEVEL_LABEL[hopVariant]
  const estimatedArm = Math.round(amount)
  const remainingCap = Math.max(0, capUsdc - committedUsdc)
  const availableInviteCount = useMemo(
    () => slots.filter((s) => s.status === 'empty').length,
    [slots],
  )

  const showMaxOutBanner =
    (renderStep === 'commit' || renderStep === 'confirmation') && remainingCap > 0 && !maxMode

  const demoMaxOut = useMemo(() => {
    if (!showMaxOutBanner) return null
    const inviteCount = hopVariant === 'hop-2' ? 0 : availableInviteCount
    const newCommitUsd = remainingCap
    return {
      ceilingUsd: capUsdc,
      newCommitUsd,
      inviteCount,
    }
  }, [showMaxOutBanner, hopVariant, availableInviteCount, remainingCap, capUsdc])

  const stepBar = {
    steps: MODAL_STEPS,
  } as const

  const handleClose = useCallback(() => {
    onClose({ step })
  }, [onClose, step])

  const handleDemoMaxOut = useCallback(() => {
    if (!demoMaxOut) return
    const plan = buildDemoMaxPlan({
      hopVariant,
      inviteCount: demoMaxOut.inviteCount,
      newCommitUsd: demoMaxOut.newCommitUsd,
    })
    setMaxMode(true)
    setMaxHopCommits(plan.hopCommits)
    setMaxInviteCount(plan.inviteCount)
    setAmount(plan.newCommitUsd)
    transitionTo('review')
  }, [demoMaxOut, hopVariant, transitionTo])

  const finishCommit = useCallback(
    (commitAmount: number) => {
      onCompleteParticipation?.(commitAmount)
      if (maxMode && maxInviteCount > 0) {
        onConsumeSelfInvites?.(maxInviteCount)
      }
      resetMax()
      transitionTo('confirmation')
    },
    [maxMode, maxInviteCount, onCompleteParticipation, onConsumeSelfInvites, resetMax, transitionTo],
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
        return (
          <Step2Commit
            {...stepBar}
            stepIndex={1}
            existingCommittedUsdc={committedUsdc}
            maxAmount={capUsdc}
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
        return (
          <Step5Confirmation
            {...stepBar}
            stepIndex={3}
            stepsStatus="confirmed"
            amount={amount}
            estimatedArm={
              wasReturningParticipantRef.current ? committedUsdc + amount : estimatedArm
            }
            isAdditionalCommit={wasReturningParticipantRef.current}
            totalCommittedUsdc={committedUsdc + amount}
            canInvite={hopVariant !== 'hop-2' && availableInviteCount > 0}
            onViewPosition={onViewPosition}
            onBackToCrowdfund={handleClose}
            onInvite={() => transitionTo('invites')}
          />
        )

      case 'invites':
        return (
          <ParticipateFlowInviteSlots
            slots={slots}
            onGenerateLink={onGenerateSlotLink ?? (async () => {})}
            onCopy={onCopySlotLink ?? (() => {})}
            onRevoke={onRevokeSlot ?? (() => {})}
            onInviteOnchain={onInviteSlotOnchain ?? (async () => {})}
            onDoItLater={handleClose}
            copiedId={copiedSlotId}
            loadingId={loadingSlotId}
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
      showClose={step !== 'invite'}
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
        {demoMaxOut ? (
          <MaxOutBanner
            maxOut={{
              ...demoMaxOut,
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
