/** Path 1 (invite link): wallet connect is RainbowKit — bar starts at commit. */
export const INVITE_LINK_STEPS = ['Commit', 'Review', 'Confirm'] as const

/** Path 2 / 3 (crowdfund modal): bar starts at commit. */
export const CROWDFUND_MODAL_STEPS = ['Commit', 'Review', 'Confirm'] as const

export type ParticipateStepsStatus = 'default' | 'error' | 'confirmed'

export interface ParticipateStepBarProps {
  steps?: readonly string[]
  stepIndex?: number
  stepsStatus?: ParticipateStepsStatus
}
