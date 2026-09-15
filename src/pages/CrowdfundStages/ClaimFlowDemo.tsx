import { useId, useState, type ReactNode } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '../../components/Button'
import Steps from '../../components/Steps/Steps'
import Tooltip from '../../components/Tooltip/Tooltip'
import styles from './ClaimFlowDemo.module.css'

export type ClaimDemoScreen =
  | 'gate-disconnected'
  | 'gate-not-open'
  | 'gate-nothing'
  | 'review-arm'
  | 'review-refund'
  | 'submit'
  | 'done-arm'
  | 'done-refund'

const ARM_STEPS = ['Review', 'Submit', 'Done']

function GateShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.gateShell}>
      <h2 className={styles.gateTitle}>{title}</h2>
      {children}
    </div>
  )
}

function FlowShell({
  currentStep,
  children,
}: {
  currentStep: number
  children: ReactNode
}) {
  return (
    <div className={styles.cardShell}>
      <Steps steps={ARM_STEPS} currentStep={currentStep} />
      {children}
    </div>
  )
}

export function ClaimFlowDemo({ screen }: { screen: ClaimDemoScreen }) {
  const delegateId = useId()
  const [delegate, setDelegate] = useState('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a3c')

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
        <FlowShell currentStep={3}>
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
            <Button variant="secondary" size="md" label="Back to crowdfund" showIcon={false} />
            <Button variant="primary" size="md" label="View position" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'review-arm':
      return (
        <FlowShell currentStep={1}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Claim your ARM</h2>
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
                <span className={styles.summaryValueAccent}>10 ARM</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>USDC refund</span>
                <span className={styles.summaryValue}>$0</span>
              </div>
            </div>
            <div className={styles.warningBlock}>
              <p className={styles.warningText}>
                A single transaction delivers your ARM and any over-cap USDC refund.
              </p>
            </div>
            <div className={styles.delegateBlock}>
              <label className={styles.delegateLabel} htmlFor={delegateId}>
                Delegate address
              </label>
              <input
                id={delegateId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={delegate}
                onChange={(e) => setDelegate(e.target.value)}
                placeholder="0x… or name.eth"
                className={styles.delegateInput}
              />
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="primary" size="lg" label="Claim ARM" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'review-refund':
      return (
        <FlowShell currentStep={1}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Claim your refund</h2>
            <div className={styles.summaryCard}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>USDC refund</span>
                <span className={styles.summaryValueAccent}>$10</span>
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
            <Button variant="primary" size="lg" label="Claim $10 refund" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'submit':
      return (
        <FlowShell currentStep={2}>
          <div className={styles.submitContent}>
            <h2 className={styles.submitTitle}>
              Confirm transaction
              <br />
              on your wallet
            </h2>
            <div className={styles.txCard} aria-live="polite" aria-label="Transaction status">
              <div className={styles.txRow}>
                <span className={styles.txLabel}>Claim ARM</span>
                <div className={styles.txStatus} aria-label="Loading">
                  <div className={styles.spinner} role="status" aria-hidden />
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.txRow}>
                <span className={styles.txLabel}>Waiting for confirmation…</span>
                <span className={styles.txStatus}>Pending</span>
              </div>
            </div>
          </div>
        </FlowShell>
      )
    case 'done-arm':
      return (
        <FlowShell currentStep={3}>
          <div className={styles.cardContent}>
            <div className={styles.heroBlock}>
              <h2 className={styles.headline}>ARM claimed.</h2>
              <p className={styles.subline}>
                10 ARM is in your wallet.
                <br />
                Your delegate now holds your governance voting power.
              </p>
            </div>
            <div className={styles.nextCard}>
              <p className={styles.nextText}>
                View your position to confirm balances, or head back to the crowdfund to see how the
                rest of the fleet finalized.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="md" label="Back to crowdfund" showIcon={false} />
            <Button variant="primary" size="md" label="View position" showIcon={false} />
          </div>
        </FlowShell>
      )
    case 'done-refund':
      return (
        <FlowShell currentStep={3}>
          <div className={styles.cardContent}>
            <div className={styles.heroBlock}>
              <h2 className={styles.headline}>Refund claimed.</h2>
              <p className={styles.subline}>$10 returned to your wallet.</p>
            </div>
            <div className={styles.nextCard}>
              <p className={styles.nextText}>
                Your USDC refund has settled on-chain. View your position or return to the crowdfund.
              </p>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button variant="secondary" size="md" label="Back to crowdfund" showIcon={false} />
            <Button variant="primary" size="md" label="View position" showIcon={false} />
          </div>
        </FlowShell>
      )
  }
}

export const CLAIM_DEMO_LABELS: Record<ClaimDemoScreen, string> = {
  'gate-disconnected': 'Gate — disconnected',
  'gate-not-open': 'Gate — claim not open',
  'gate-nothing': 'Nothing to claim',
  'review-arm': 'Review — ARM claim',
  'review-refund': 'Review — USDC refund',
  submit: 'Submit (in wallet)',
  'done-arm': 'Done — ARM claimed',
  'done-refund': 'Done — refund claimed',
}

export const CLAIM_DEMO_SCREENS = Object.keys(CLAIM_DEMO_LABELS) as ClaimDemoScreen[]
