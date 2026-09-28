import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import {
  DEMO_INVITE_ALLOWANCE,
} from '../MyPosition/myPositionDemo'
import {
  availableForHop,
  type InviteAllowance,
  type InviteeHop,
} from '../MyPosition/inviteModel'
import { hopPillDotColor } from '../../constants/graphHopColors'
import Step2Commit from './screens/Step2Commit'
import Step3Review, { type Step3ReviewHopCommit } from './screens/Step3Review'
import Step4Approve from './screens/Step4Approve'
import Step5Confirmation from './screens/Step5Confirmation'
import { MaxOutBanner } from './screens/MaxOutBanner'
import maxOutStyles from './screens/MaxOutBanner.module.css'
import { ParticipateFlowModal } from './ParticipateFlowModal'
import { ParticipateFlowInviteSlots } from './ParticipateFlowInviteSlots'
import { INVITE_LINK_STEPS } from './participateFlowSteps'
import inlineStyles from './ParticipateFlowInviteInline.module.css'
import stepStyles from './ParticipateFlowStepTransition.module.css'
import type { DemoSelfFillPlan } from '../../lib/demoSelfFill'

const HOP_LABELS = ['HOP-0', 'HOP-1', 'HOP-2'] as const
const HOP_DOT_KEYS = ['seed', 'hop-1', 'hop-2'] as const

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

export type InviteLinkFlowStep =
  | 'commit'
  | 'review'
  | 'approve'
  | 'confirmation'
  | 'invites'

export interface ParticipateFlowInviteLinkCloseContext {
  step: InviteLinkFlowStep
}

export interface ParticipateFlowInviteLinkProps {
  open: boolean
  /** `inline` swaps content in the invite landing shell; `modal` overlays a dialog. */
  presentation?: 'modal' | 'inline'
  onClose: (context: ParticipateFlowInviteLinkCloseContext) => void
  /** @deprecated Wallet connect is RainbowKit; kept for callers. Ignored for step routing. */
  walletConnected?: boolean
  /** @deprecated Unused — connect happens outside this flow. */
  onConnectWallet?: (provider: string) => void
  onCompleteParticipation?: (amountUsdc: number) => void
  /** Apply POC-style self-fill (invites on self + multi-hop commits). */
  onApplyMaxOutPlan?: (plan: DemoSelfFillPlan) => void
  onViewPosition?: () => void
  hasParticipated?: boolean
  committedUsdc?: number
  /** Current-hop ceiling (no new self-invites) — Step2Commit MAX. */
  capUsdc?: number
  /** Remaining USDC on currently held hops. */
  remainingHopUsdc?: number
  /** Live self-fill plan from session (POC computeSelfFillPlan mirror). */
  maxOutPlan?: DemoSelfFillPlan | null
  hopVariant?: HopVariant
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

const HOP_LEVEL_LABEL: Record<HopVariant, string> = {
  seed: 'Hop-0',
  'hop-1': 'Hop-1',
  'hop-2': 'Hop-2',
  'multi-hop': 'Multi-hop',
}

const MODAL_STEPS = [...INVITE_LINK_STEPS]
const STEP_TRANSITION_MS = 240

const MY_POSITION_URL = `${import.meta.env.BASE_URL}?view=myposition`

const DIALOG_LABEL: Record<InviteLinkFlowStep, string> = {
  commit: 'How much USDC?',
  review: 'Review your commitment',
  approve: 'Confirm transactions on your wallet',
  confirmation: 'Participation confirmed',
  invites: 'Whitelist a friend',
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
 * Path 1 — invite link entry.
 * Landing page shows Step 0; this flow runs Commit → Review → Confirm.
 * Wallet connect is RainbowKit (outside this flow).
 * Commit MAX = current-hop ceiling; Max out = self-fill projected ceiling (POC parity).
 */
export function ParticipateFlowInviteLink({
  open,
  presentation = 'modal',
  onClose,
  onCompleteParticipation,
  onApplyMaxOutPlan,
  onViewPosition,
  hasParticipated = false,
  committedUsdc = 0,
  capUsdc = 4_000,
  remainingHopUsdc,
  maxOutPlan = null,
  hopVariant = 'hop-1',
  slots = [],
  inviteAllowance = DEMO_INVITE_ALLOWANCE,
  onGenerateInviteLink,
  onGenerateSlotLink,
  onRevokeSlot,
  onInviteOnchainHop,
  onInviteSlotOnchain,
  onCopySlotLink,
  loadingHop = null,
  loadingSlotId = null,
  copiedSlotId = null,
}: ParticipateFlowInviteLinkProps) {
  const [step, setStep] = useState<InviteLinkFlowStep>('commit')
  const [renderStep, setRenderStep] = useState<InviteLinkFlowStep>('commit')
  const [fading, setFading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [maxMode, setMaxMode] = useState(false)
  const [activeMaxPlan, setActiveMaxPlan] = useState<DemoSelfFillPlan | null>(null)
  const [maxHopCommits, setMaxHopCommits] = useState<Step3ReviewHopCommit[] | null>(null)
  const [maxInviteCount, setMaxInviteCount] = useState(0)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasReturningParticipantRef = useRef(false)
  const wasOpenRef = useRef(false)

  const resetMax = useCallback(() => {
    setMaxMode(false)
    setActiveMaxPlan(null)
    setMaxHopCommits(null)
    setMaxInviteCount(0)
  }, [])

  const availableInviteCount = useMemo(
    () =>
      availableForHop(slots, inviteAllowance, 1) +
      availableForHop(slots, inviteAllowance, 2),
    [slots, inviteAllowance],
  )

  const clearTransitionTimer = () => {
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current)
      transitionTimer.current = null
    }
  }

  const transitionTo = useCallback((next: InviteLinkFlowStep) => {
    clearTransitionTimer()
    setFading(true)
    transitionTimer.current = setTimeout(() => {
      setStep(next)
      setRenderStep(next)
      setFading(false)
      transitionTimer.current = null
    }, STEP_TRANSITION_MS)
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
        setStep('commit')
        setRenderStep('commit')
      }
      return
    }

    if (open) return

    clearTransitionTimer()
    setStep('commit')
    setRenderStep('commit')
    setFading(false)
    setAmount(0)
    resetMax()
    wasReturningParticipantRef.current = false
  }, [open, hasParticipated, remainingCap, maxOutPlan?.newCommitUsdc, resetMax])

  const hopLevel = HOP_LEVEL_LABEL[hopVariant]
  const estimatedArm = Math.round(amount)
  const isFullyCommitted = hasParticipated && remainingCap <= 0
  const canSelfFill = (maxOutPlan?.newCommitUsdc ?? 0) > 0
  const showMaxOutBanner = renderStep === 'commit' && !maxMode && canSelfFill

  const stepBar = {
    steps: MODAL_STEPS,
  } as const

  const handleClose = useCallback(() => {
    onClose({ step })
  }, [onClose, step])

  const handleViewPosition = useCallback(() => {
    if (onViewPosition) {
      onViewPosition()
      return
    }
    window.location.assign(MY_POSITION_URL)
  }, [onViewPosition])

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
      resetMax,
      transitionTo,
    ],
  )

  const renderCurrentStep = () => {
    switch (renderStep) {
      case 'commit':
        if (isFullyCommitted && !canSelfFill) {
          return (
            <Step5Confirmation
              {...stepBar}
              stepIndex={3}
              stepsStatus="confirmed"
              amount={amount}
              estimatedArm={committedUsdc}
              isAdditionalCommit
              totalCommittedUsdc={committedUsdc}
              maxedOut
              showViewPositionButton
              canInvite={availableInviteCount > 0}
              onViewPosition={handleViewPosition}
              onBackToCrowdfund={handleClose}
              onInvite={() => transitionTo('invites')}
            />
          )
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
              onViewPosition={handleViewPosition}
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
            showBack={false}
            onBack={handleClose}
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
              wasReturningParticipantRef.current ? committedUsdc : estimatedArm
            }
            isAdditionalCommit={wasReturningParticipantRef.current}
            totalCommittedUsdc={committedUsdc}
            showViewPositionButton
            canInvite={availableInviteCount > 0}
            onViewPosition={handleViewPosition}
            onBackToCrowdfund={handleClose}
            onInvite={() => transitionTo('invites')}
          />
        )

      case 'invites': {
        const invites = (
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
        return presentation === 'inline' ? (
          <div className={inlineStyles.invitesWrap} data-flow-shell>
            {invites}
          </div>
        ) : (
          invites
        )
      }

      default:
        return null
    }
  }

  const stepContent = (
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
  )

  if (presentation === 'inline') {
    if (!open) return null

    return (
      <div className={inlineStyles.slot} data-flow-shell>
        <div className={inlineStyles.step} data-flow-shell>
          {stepContent}
        </div>
      </div>
    )
  }

  return (
    <ParticipateFlowModal open={open} onClose={handleClose} ariaLabel={DIALOG_LABEL[step]}>
      {stepContent}
    </ParticipateFlowModal>
  )
}
