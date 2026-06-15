import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import Step1Wallet from './screens/Step1Wallet'
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
  | 'wallet'
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
  walletConnected?: boolean
  onConnectWallet?: (provider: string) => void
  onCompleteParticipation?: (amountUsdc: number) => void
  onViewPosition?: () => void
  hasParticipated?: boolean
  committedUsdc?: number
  hopVariant?: HopVariant
  slots?: SlotData[]
  onGenerateSlotLink?: (slotId: number) => Promise<void>
  onRevokeSlot?: (slotId: number) => void
  onInviteSlotOnchain?: (slotId: number, address: string, ensName?: string) => Promise<void>
  onCopySlotLink?: (slotId: number, link: string) => void
  loadingSlotId?: number | null
  copiedSlotId?: number | null
}

const HOP_LEVEL_LABEL: Record<HopVariant, string> = {
  seed: 'Seed',
  'hop-1': 'Hop 1',
  'hop-2': 'Hop 2',
  'multi-hop': 'Multi-hop',
}

const MODAL_STEPS = [...INVITE_LINK_STEPS]
const STEP_TRANSITION_MS = 240

const MY_POSITION_URL = `${import.meta.env.BASE_URL}?view=myposition`

const DIALOG_LABEL: Record<InviteLinkFlowStep, string> = {
  wallet: 'Select your wallet',
  commit: 'How much USDC?',
  review: 'Review your commitment',
  approve: 'Confirm transactions on your wallet',
  confirmation: 'Participation confirmed',
  invites: 'Invite participants',
}

function initialStep(walletConnected: boolean): InviteLinkFlowStep {
  return walletConnected ? 'commit' : 'wallet'
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
 * Landing page shows Step 0; this flow runs Connect → Commit → Review → Confirm.
 */
export function ParticipateFlowInviteLink({
  open,
  presentation = 'modal',
  onClose,
  walletConnected = false,
  onConnectWallet,
  onCompleteParticipation,
  onViewPosition,
  hasParticipated = false,
  committedUsdc = 0,
  hopVariant = 'hop-1',
  slots = [],
  onGenerateSlotLink,
  onRevokeSlot,
  onInviteSlotOnchain,
  onCopySlotLink,
  loadingSlotId = null,
  copiedSlotId = null,
}: ParticipateFlowInviteLinkProps) {
  const [step, setStep] = useState<InviteLinkFlowStep>(() => initialStep(walletConnected))
  const [renderStep, setRenderStep] = useState<InviteLinkFlowStep>(() => initialStep(walletConnected))
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
      const start = initialStep(walletConnected)
      setStep(start)
      setRenderStep(start)
      return
    }

    if (open) return

    clearTransitionTimer()
    const start = initialStep(walletConnected)
    setStep(start)
    setRenderStep(start)
    setFading(false)
    setAmount(0)
    wasReturningParticipantRef.current = false
  }, [open, walletConnected, hasParticipated])

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
      case 'wallet':
        return (
          <Step1Wallet
            showSteps
            onNext={(provider) => {
              onConnectWallet?.(provider)
              transitionTo('commit')
            }}
          />
        )

      case 'commit':
        return (
          <Step2Commit
            {...stepBar}
            stepIndex={2}
            existingCommittedUsdc={committedUsdc}
            showBack={!hasParticipated}
            onBack={() => transitionTo('wallet')}
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
            stepIndex={3}
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
            stepIndex={4}
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
            stepIndex={4}
            stepsStatus="confirmed"
            amount={amount}
            estimatedArm={
              wasReturningParticipantRef.current ? committedUsdc : estimatedArm
            }
            isAdditionalCommit={wasReturningParticipantRef.current}
            totalCommittedUsdc={committedUsdc}
            showViewPositionButton
            onViewPosition={handleViewPosition}
            onInvite={() => transitionTo('invites')}
          />
        )

      case 'invites': {
        const invites = (
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
