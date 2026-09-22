import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import {
  DEMO_INVITE_ALLOWANCE,
} from '../MyPosition/myPositionDemo'
import type { InviteAllowance, InviteeHop } from '../MyPosition/inviteModel'
import Step2Commit from './screens/Step2Commit'
import Step3Review from './screens/Step3Review'
import Step4Approve from './screens/Step4Approve'
import Step5Confirmation from './screens/Step5Confirmation'
import { ParticipateFlowModal } from './ParticipateFlowModal'
import { ParticipateFlowInviteSlots } from './ParticipateFlowInviteSlots'
import { INVITE_LINK_STEPS } from './participateFlowSteps'
import inlineStyles from './ParticipateFlowInviteInline.module.css'
import stepStyles from './ParticipateFlowStepTransition.module.css'

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
  onViewPosition?: () => void
  hasParticipated?: boolean
  committedUsdc?: number
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
  'hop-1': 'Hop 1',
  'hop-2': 'Hop 2',
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
 */
export function ParticipateFlowInviteLink({
  open,
  presentation = 'modal',
  onClose,
  onCompleteParticipation,
  onViewPosition,
  hasParticipated = false,
  committedUsdc = 0,
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
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasReturningParticipantRef = useRef(false)
  const wasOpenRef = useRef(false)

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

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open

    if (justOpened) {
      wasReturningParticipantRef.current = hasParticipated
      setStep('commit')
      setRenderStep('commit')
      return
    }

    if (open) return

    clearTransitionTimer()
    setStep('commit')
    setRenderStep('commit')
    setFading(false)
    setAmount(0)
    wasReturningParticipantRef.current = false
  }, [open, hasParticipated])

  const hopLevel = HOP_LEVEL_LABEL[hopVariant]
  const estimatedArm = Math.round(amount)

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

  const renderCurrentStep = () => {
    switch (renderStep) {
      case 'commit':
        return (
          <Step2Commit
            {...stepBar}
            stepIndex={1}
            existingCommittedUsdc={committedUsdc}
            showBack={false}
            onBack={handleClose}
            onNext={(nextAmount) => {
              setAmount(nextAmount)
              transitionTo('review')
            }}
          />
        )

      case 'review':
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
            onDone={() => {
              onCompleteParticipation?.(amount)
              transitionTo('confirmation')
            }}
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
            canInvite={hopVariant !== 'hop-2'}
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
    <StepTransition stepKey={renderStep} fading={fading}>
      {renderCurrentStep()}
    </StepTransition>
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
