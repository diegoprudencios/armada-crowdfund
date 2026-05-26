import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { HopVariant } from '../HopPill/HopPill'
import type { SlotData } from '../InviteFlow/screens/SlotCard'
import Step0Invite from './steps/Step0Invite/Step0Invite'
import Step1Wallet from './screens/Step1Wallet'
import Step2Commit from './screens/Step2Commit'
import Step3Review from './screens/Step3Review'
import Step4Approve from './screens/Step4Approve'
import Step5Confirmation from './screens/Step5Confirmation'
import { ParticipateFlowModal } from './ParticipateFlowModal'
import { ParticipateFlowInviteSlots } from './ParticipateFlowInviteSlots'
import { CROWDFUND_MODAL_STEPS } from './participateFlowSteps'
import stepStyles from './ParticipateFlowStepTransition.module.css'

export interface ParticipateFlowCrowdfundProps {
  open: boolean
  onClose: () => void
  walletConnected?: boolean
  onConnectWallet?: (provider: string) => void
  onCompleteParticipation?: (amountUsdc: number) => void
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

type CrowdfundFlowStep =
  | 'wallet'
  | 'invite'
  | 'commit'
  | 'review'
  | 'approve'
  | 'confirmation'
  | 'invites'

const HOP_LEVEL_LABEL: Record<HopVariant, string> = {
  seed: 'Seed',
  'hop-1': 'Hop 1',
  'hop-2': 'Hop 2',
  'multi-hop': 'Multi-hop',
}

const MODAL_STEPS = [...CROWDFUND_MODAL_STEPS]
const STEP_TRANSITION_MS = 240

const DIALOG_LABEL: Record<CrowdfundFlowStep, string> = {
  wallet: 'Select your wallet',
  invite: 'You are invited to join the fleet',
  commit: 'How much USDC?',
  review: 'Review your commitment',
  approve: 'Confirm transactions on your wallet',
  confirmation: 'Participation confirmed',
  invites: 'Invite participants',
}

function initialStep(walletConnected: boolean): CrowdfundFlowStep {
  return walletConnected ? 'invite' : 'wallet'
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
 * Wallet gate first when disconnected; Step 0 has no connect eyebrow.
 * Progress bar: Commit → Review → Confirm (from commit onward).
 */
export function ParticipateFlowCrowdfund({
  open,
  onClose,
  walletConnected = false,
  onConnectWallet,
  onCompleteParticipation,
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
  const [step, setStep] = useState<CrowdfundFlowStep>(() => initialStep(walletConnected))
  const [renderStep, setRenderStep] = useState<CrowdfundFlowStep>(() => initialStep(walletConnected))
  const [fading, setFading] = useState(false)
  const [amount, setAmount] = useState(0)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    return () => clearTransitionTimer()
  }, [])

  useEffect(() => {
    if (!open) {
      clearTransitionTimer()
      const start = initialStep(walletConnected)
      setStep(start)
      setRenderStep(start)
      setFading(false)
      setAmount(0)
    }
  }, [open, walletConnected])

  const hopLevel = HOP_LEVEL_LABEL[hopVariant]
  const estimatedArm = Math.round(amount)

  const stepBar = {
    steps: MODAL_STEPS,
  } as const

  const renderCurrentStep = () => {
    switch (renderStep) {
      case 'wallet':
        return (
          <Step1Wallet
            showSteps={false}
            compact
            onNext={(provider) => {
              onConnectWallet?.(provider)
              transitionTo('invite')
            }}
          />
        )

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
            onBack={() => transitionTo('invite')}
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
            estimatedArm={estimatedArm}
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
            onDoItLater={onClose}
            copiedId={copiedSlotId}
            loadingId={loadingSlotId}
          />
        )

      default:
        return null
    }
  }

  return (
    <ParticipateFlowModal open={open} onClose={onClose} ariaLabel={DIALOG_LABEL[step]}>
      <StepTransition stepKey={renderStep} fading={fading}>
        {renderCurrentStep()}
      </StepTransition>
    </ParticipateFlowModal>
  )
}
