// ABOUTME: Static claim-flow screens for Crowdfund Stages — mirrors ClaimFlow + FlowChrome.
// ABOUTME: Gallery + modal previews; interactive claim lives in CrowdfundExperience.

import type { ReactNode } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/Button'
import { FlowChrome } from '../../components/ParticipateFlow/FlowChrome'
import Tooltip from '../../components/Tooltip/Tooltip'
import { WalletConfirmStep } from '../../components/WalletConfirm'
import styles from './ClaimFlowDemo.module.css'

export type ClaimDemoScreen =
  | 'gate-disconnected'
  | 'gate-not-open'
  | 'gate-nothing'
  | 'intro-arm'
  | 'delegate'
  | 'review-arm'
  | 'review-refund'
  | 'submit'
  | 'done-arm'
  | 'done-refund'

function GateShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.gateShell}>
      <h2 className={styles.gateTitle}>{title}</h2>
      {children}
    </div>
  )
}

function FlowShell({
  title,
  showBack = true,
  children,
}: {
  title?: ReactNode
  showBack?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.cardShell}>
      <FlowChrome
        title={title}
        showBack={showBack}
        onBack={showBack ? () => undefined : undefined}
        onClose={() => undefined}
        closeAriaLabel="Close claim flow"
      />
      {children}
    </div>
  )
}

export function ClaimFlowDemo({ screen }: { screen: ClaimDemoScreen }) {
  switch (screen) {
    case 'gate-disconnected':
      return (
        <GateShell title="Connect your wallet to claim">
          <p className={styles.gateBody}>
            Once the campaign finalizes you&apos;ll be able to claim ARM tokens (or a USDC refund)
            from here.
          </p>
        </GateShell>
      )
    case 'gate-not-open':
      return (
        <GateShell title="Claiming isn't open yet">
          <p className={styles.gateBody}>
            You&apos;ll be able to claim ARM tokens (or a USDC refund if the sale ends below the
            minimum fund) from here.
          </p>
          <p className={styles.gateBodyFootnote}>
            Estimated: <span className={styles.accent}>2d 14h left</span>
          </p>
          <div className={styles.gateActions}>
            <Button variant="secondary" size="md" label="Back to crowdfund" showIcon={false} />
          </div>
        </GateShell>
      )
    case 'gate-nothing':
      return (
        <FlowShell title="Claim" showBack={false}>
          <div className={styles.cardContent}>
            <div className={styles.heroBlock}>
              <h2 className={styles.headline}>Nothing to claim.</h2>
              <p className={styles.subline}>
                0x1a2b…9a3c has no sale allocation.
                <br />
                You may have committed with a different wallet.
              </p>
            </div>
            <div className={styles.nextCard}>
              <p className={styles.nextText}>
                If you committed but expected an allocation here, switch to the wallet you used to
                commit and reload the claim page.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="lg" label="Back to crowdfund" showIcon={false} />
            <Button variant="primary" size="lg" label="View position" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'intro-arm':
      return (
        <FlowShell title="Claim your ARM tokens" showBack={false}>
          <div className={styles.introWrap}>
            <div className={styles.introScroll}>
              <ol className={styles.stepCards} aria-label="How to claim">
                <li className={styles.stepCard}>
                  <span className={styles.stepNumber} aria-hidden>
                    1
                  </span>
                  <div className={styles.stepCopy}>
                    <span className={styles.stepLabel}>Delegate</span>
                    <span className={styles.stepHint}>Select how to delegate your vote</span>
                  </div>
                </li>
                <li className={styles.stepCard}>
                  <span className={styles.stepNumber} aria-hidden>
                    2
                  </span>
                  <div className={styles.stepCopy}>
                    <span className={styles.stepLabel}>Review</span>
                    <span className={styles.stepHint}>Confirm allocation and delegate</span>
                  </div>
                </li>
                <li className={styles.stepCard}>
                  <span className={styles.stepNumber} aria-hidden>
                    3
                  </span>
                  <div className={styles.stepCopy}>
                    <span className={styles.stepLabel}>Confirm</span>
                    <span className={styles.stepHint}>Approve claim in your wallet</span>
                  </div>
                </li>
              </ol>
              <div className={styles.factsCard}>
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>ARM allocation</span>
                  <span className={styles.factValueAccent}>20 ARM</span>
                </div>
                <div className={styles.divider} aria-hidden />
                <div className={styles.factRow}>
                  <span className={styles.factLabel}>Final commit</span>
                  <span className={styles.factValue}>$2,000</span>
                </div>
              </div>
              <section className={styles.knowBlock} aria-labelledby="claim-demo-know">
                <h3 id="claim-demo-know" className={styles.knowHeading}>
                  What to know
                </h3>
                <ul className={styles.knowList}>
                  <li className={styles.knowItem}>
                    <span className={styles.knowBullet} aria-hidden>
                      ·
                    </span>
                    <span>You’ll need a little ETH in this wallet for gas.</span>
                  </li>
                  <li className={styles.knowItem}>
                    <span className={styles.knowBullet} aria-hidden>
                      ·
                    </span>
                    <span>A single transaction delivers your ARM and sets your delegate.</span>
                  </li>
                  <li className={styles.knowItem}>
                    <span className={styles.knowBullet} aria-hidden>
                      ·
                    </span>
                    <span>Voting power starts once you claim and delegate.</span>
                  </li>
                  <li className={styles.knowItem}>
                    <span className={styles.knowBullet} aria-hidden>
                      ·
                    </span>
                    <span>
                      Any USDC above your final allocation is refunded in the same transaction.
                    </span>
                  </li>
                </ul>
              </section>
            </div>
            <div className={styles.introFade} aria-hidden />
          </div>
          <div className={styles.buttonRow}>
            <Button variant="primary" size="lg" label="Start" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'delegate':
      return (
        <FlowShell title="Choose your delegate">
          <div className={styles.cardContent}>
            <fieldset className={styles.radioGroup}>
              <legend className={styles.visuallyHidden}>Delegation preference</legend>
              <label className={[styles.radioOption, styles.radioOptionSelected].join(' ')}>
                <input
                  className={styles.radioInput}
                  type="radio"
                  name="claim-demo-delegate"
                  defaultChecked
                  readOnly
                />
                <span className={styles.radioCopy}>
                  <span className={styles.radioTitle}>Keep voting powers</span>
                  <span className={styles.radioHint}>
                    Self-delegate — you vote with the ARM claimed to this wallet.
                  </span>
                </span>
              </label>
              <label className={styles.radioOption}>
                <input
                  className={styles.radioInput}
                  type="radio"
                  name="claim-demo-delegate"
                  readOnly
                />
                <span className={styles.radioCopy}>
                  <span className={styles.radioTitle}>Delegate vote</span>
                  <span className={styles.radioHint}>
                    Assign voting power to another address that can vote on your behalf.
                  </span>
                </span>
              </label>
            </fieldset>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="primary" size="lg" label="Review" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'review-arm':
      return (
        <FlowShell title="Review claim">
          <div className={styles.cardContent}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <div className={styles.summaryLabelGroup}>
                  <span className={styles.summaryLabel}>ARM allocation</span>
                  <Tooltip
                    variant="rich"
                    title="ARM allocation"
                    description="The ARM tokens delivered to your wallet by this transaction."
                    bullets={[
                      'Pro-rata share of the sale, capped at your hop allocation',
                      'Delegate set below receives your governance voting power',
                      'Any committed USDC not used to buy ARM is refunded in the same tx',
                    ]}
                  >
                    <button
                      type="button"
                      className={styles.infoTrigger}
                      aria-label="ARM allocation details"
                    >
                      <InformationCircleIcon className={styles.infoIcon} aria-hidden />
                    </button>
                  </Tooltip>
                </div>
                <span className={styles.summaryValueAccent}>7 ARM</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Self-delegate</span>
                <span className={styles.summaryValue}>0x1a2b…9a3c</span>
              </div>
            </div>
            <div className={styles.warningBlock}>
              <p className={styles.warningText}>
                A single transaction delivers your ARM and sets your delegate.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="primary" size="lg" label="Claim ARM" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'review-refund':
      return (
        <FlowShell title="Review">
          <div className={styles.cardContent}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>USDC refund</span>
                <span className={styles.summaryValueAccent}>$1,000</span>
              </div>
            </div>
            <div className={styles.warningBlock}>
              <p className={styles.warningText}>
                The sale ended below the minimum fund, so no ARM was sold. Your full committed USDC
                is available to claim back.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="primary" size="lg" label="Claim $1,000 refund" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'submit':
      return (
        <FlowShell title="Confirm">
          <WalletConfirmStep
            transactions={[{ label: 'Claim ARM', status: 'loading' }]}
          />
        </FlowShell>
      )
    case 'done-arm':
      return (
        <FlowShell showBack={false}>
          <div className={styles.cardContent}>
            <div className={styles.heroBlock}>
              <CheckCircleIcon className={styles.successIcon} aria-hidden />
              <h2 className={styles.headline}>ARM claimed.</h2>
              <p className={styles.subline}>
                Your ARM is settled on-chain and your delegate is active.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="lg" label="View on explorer" showIcon={false} />
            <Button variant="primary" size="lg" label="Close" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'done-refund':
      return (
        <FlowShell showBack={false}>
          <div className={styles.cardContent}>
            <div className={styles.heroBlock}>
              <CheckCircleIcon className={styles.successIcon} aria-hidden />
              <h2 className={styles.headline}>Refund claimed.</h2>
              <p className={styles.subline}>Your USDC refund is settled on-chain.</p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="lg" label="View on explorer" showIcon={false} />
            <Button variant="primary" size="lg" label="Close" showIcon={false} />
          </div>
        </FlowShell>
      )
  }
}

export const CLAIM_DEMO_LABELS: Record<ClaimDemoScreen, string> = {
  'gate-disconnected': 'Gate — disconnected',
  'gate-not-open': 'Gate — claim not open',
  'gate-nothing': 'Nothing to claim',
  'intro-arm': 'Intro — Start',
  delegate: 'Choose delegate',
  'review-arm': 'Review — ARM claim',
  'review-refund': 'Review — USDC refund',
  submit: 'Confirm (in wallet)',
  'done-arm': 'Done — ARM claimed',
  'done-refund': 'Done — refund claimed',
}

export const CLAIM_DEMO_SCREENS = Object.keys(CLAIM_DEMO_LABELS) as ClaimDemoScreen[]
