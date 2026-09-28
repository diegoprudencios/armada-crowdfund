// ABOUTME: Interactive claim flow — Intro → Delegate → Review → Submit → Done (ARM), or Intro → Review for refunds.

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  CheckIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../Button'
import Steps from '../Steps/Steps'
import Tooltip from '../Tooltip/Tooltip'
import styles from '../../pages/CrowdfundStages/ClaimFlowDemo.module.css'

export type ClaimFlowMode = 'arm' | 'refund'

export interface ClaimFlowProps {
  walletConnected: boolean
  walletDisplayAddress?: string
  claimAvailable: boolean
  /** True while phase 0 after window end but claim tab already open (below-min). */
  awaitingFinalize?: boolean
  mode: ClaimFlowMode
  hasParticipated: boolean
  hasClaimed: boolean
  armAmount?: number
  refundUsdc?: number
  committedUsdc?: number
  /** Over-cap USDC returned with an ARM claim. Hidden on review when 0. */
  claimUsdcRefund?: number
  onClaim: () => void
  onBackToCrowdfund: () => void
  onViewPosition: () => void
  onConnectWallet?: () => void
}

type FlowStep = 'intro' | 'delegate' | 'review' | 'submit' | 'done'
type DelegateChoice = 'self' | 'other'
type DelegateScreen = 'choice' | 'picker'

type DelegateCandidate = {
  address: string
  display: string
  ens?: string
}

const ARM_FLOW_LABEL = 'Claim ARM tokens'
const ARM_STEPS = ['Delegate', 'Review', 'Done'] as const
const REFUND_STEPS = ['Review', 'Done'] as const

/** Demo ARM token address — replace with deployment manifest when wired live. */
const DEMO_ARM_TOKEN_ADDRESS = '0xA11Ada0000000000000000000000000000A11Ada'

function truncateMiddle(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

/** Demo delegate directory — searchable list for the Delegate vote option. */
const DELEGATE_CANDIDATES: ReadonlyArray<DelegateCandidate> = [
  {
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    display: '0xAb58…eC9B',
    ens: 'vitalik.eth',
  },
  {
    address: '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326',
    display: '0x1f90…c326',
    ens: 'banteg.eth',
  },
  {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    display: '0xd8dA…6045',
    ens: 'brantly.eth',
  },
  {
    address: '0x5a3FcEfCb76c787bfA4F5b8E8E8C0bC0d6E5F123',
    display: '0x5a3F…F123',
    ens: 'armada.eth',
  },
  {
    address: '0x9C7F8A2B4D6E1F3058A9C0B7D2E4F6A8C1D3E5F7',
    display: '0x9C7F…E5F7',
  },
  {
    address: '0x2B4D6E8F0A1C3E5F7A9B0C2D4E6F8A0B1C3D5E7',
    display: '0x2B4D…5E7F',
    ens: 'governance.eth',
  },
]

function formatUsd(value: number) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function GateShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.gateShell}>
      <h2 className={styles.gateTitle}>{title}</h2>
      {children}
    </div>
  )
}

function FlowShell({
  steps,
  currentStep,
  stepsStatus = 'default',
  flowLabel,
  children,
}: {
  steps: readonly string[]
  currentStep: number
  stepsStatus?: 'default' | 'confirmed'
  flowLabel?: string
  children: ReactNode
}) {
  return (
    <div className={styles.cardShell}>
      <Steps
        steps={[...steps]}
        currentStep={currentStep}
        status={stepsStatus}
        flowLabel={flowLabel}
      />
      {children}
    </div>
  )
}

export function ClaimFlow({
  walletConnected,
  walletDisplayAddress = '0x1a2b…9a3c',
  claimAvailable,
  awaitingFinalize = false,
  mode,
  hasParticipated,
  hasClaimed,
  armAmount = 10,
  refundUsdc,
  committedUsdc = 0,
  claimUsdcRefund = 0,
  onClaim,
  onBackToCrowdfund,
  onViewPosition,
  onConnectWallet,
}: ClaimFlowProps) {
  const selfRadioId = useId()
  const otherRadioId = useId()
  const searchId = useId()
  const radioName = useId()

  const [step, setStep] = useState<FlowStep>(hasClaimed ? 'done' : 'intro')
  const [delegateChoice, setDelegateChoice] = useState<DelegateChoice>('self')
  const [delegateScreen, setDelegateScreen] = useState<DelegateScreen>('choice')
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateCandidate | null>(null)
  const [delegateQuery, setDelegateQuery] = useState('')
  const [armAddressCopied, setArmAddressCopied] = useState(false)

  const refundAmount = refundUsdc ?? committedUsdc
  const steps = mode === 'refund' ? REFUND_STEPS : ARM_STEPS
  const armFlowLabel = mode === 'arm' ? ARM_FLOW_LABEL : undefined
  const armLabel = armAmount.toLocaleString()

  const filteredDelegates = useMemo(() => {
    const q = delegateQuery.trim().toLowerCase()
    if (!q) return DELEGATE_CANDIDATES
    return DELEGATE_CANDIDATES.filter(
      (c) =>
        c.address.toLowerCase().includes(q) ||
        c.display.toLowerCase().includes(q) ||
        (c.ens?.toLowerCase().includes(q) ?? false),
    )
  }, [delegateQuery])

  const effectiveDelegateLabel =
    delegateChoice === 'self'
      ? walletDisplayAddress
      : selectedDelegate
        ? selectedDelegate.ens ?? selectedDelegate.display
        : null

  useEffect(() => {
    setStep(hasClaimed ? 'done' : 'intro')
    setDelegateChoice('self')
    setDelegateScreen('choice')
    setSelectedDelegate(null)
    setDelegateQuery('')
  }, [hasClaimed, mode])

  useEffect(() => {
    if (step !== 'submit') return
    const id = window.setTimeout(() => {
      onClaim()
      setStep('done')
    }, 1600)
    return () => window.clearTimeout(id)
  }, [step, onClaim])

  if (!walletConnected) {
    return (
      <GateShell title="Connect your wallet to claim">
        <p className={styles.gateBody}>
          Once the campaign finalizes you&apos;ll be able to claim ARM tokens (or a USDC refund)
          from here.
        </p>
        {onConnectWallet ? (
          <div className={styles.gateActions}>
            <Button
              variant="primary"
              size="md"
              label="Connect wallet"
              showIcon={false}
              onClick={onConnectWallet}
            />
          </div>
        ) : null}
      </GateShell>
    )
  }

  if (!claimAvailable) {
    return (
      <GateShell title="Claiming isn't open yet">
        <p className={styles.gateBody}>
          You&apos;ll be able to claim ARM tokens (or a USDC refund if the sale ends below the
          minimum fund) from here.
        </p>
        <div className={styles.gateActions}>
          <Button
            variant="secondary"
            size="md"
            label="Back to crowdfund"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
        </div>
      </GateShell>
    )
  }

  if (awaitingFinalize) {
    return (
      <GateShell title="Sale ended below minimum">
        <p className={styles.gateBody}>
          The commit window is closed under the minimum fund. Claim opens after the sale is
          finalized — you&apos;ll reclaim your full USDC commitment.
        </p>
        <div className={styles.gateActions}>
          <Button
            variant="secondary"
            size="md"
            label="Back to crowdfund"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
        </div>
      </GateShell>
    )
  }

  if (!hasParticipated && step !== 'done') {
    return (
      <FlowShell steps={steps} currentStep={steps.length} flowLabel={armFlowLabel}>
        <div className={styles.cardContent}>
          <div className={styles.heroBlock}>
            <h2 className={styles.headline}>Nothing to claim.</h2>
            <p className={styles.subline}>
              {walletDisplayAddress} has no sale allocation.
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
          <Button
            variant="secondary"
            size="md"
            label="Back to crowdfund"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
          <Button
            variant="primary"
            size="md"
            label="View position"
            showIcon={false}
            onClick={onViewPosition}
          />
        </div>
      </FlowShell>
    )
  }

  if (step === 'done' || hasClaimed) {
    const copyArmAddress = () => {
      void navigator.clipboard.writeText(DEMO_ARM_TOKEN_ADDRESS)
      setArmAddressCopied(true)
      window.setTimeout(() => setArmAddressCopied(false), 1600)
    }

    return (
      <FlowShell
        steps={steps}
        currentStep={steps.length}
        stepsStatus="confirmed"
        flowLabel={armFlowLabel}
      >
        <div className={styles.cardContent}>
          <div className={styles.heroBlock}>
            <h2 className={styles.headline}>
              {mode === 'refund' ? 'Refund claimed.' : 'ARM claimed.'}
            </h2>
            <p className={styles.subline}>
              {mode === 'refund'
                ? 'Your USDC refund is settled on-chain.'
                : 'Your ARM is settled on-chain and your delegate is active.'}
            </p>
          </div>
          {mode === 'arm' ? (
            <div className={styles.contractRow}>
              <div className={styles.contractRowText}>
                <span className={styles.contractRowLabel}>ARM contract address</span>
                <span className={styles.contractRowAddress} title={DEMO_ARM_TOKEN_ADDRESS}>
                  {truncateMiddle(DEMO_ARM_TOKEN_ADDRESS)}
                </span>
              </div>
              <button
                type="button"
                className={styles.contractCopyBtn}
                onClick={copyArmAddress}
                aria-label={
                  armAddressCopied ? 'ARM contract address copied' : 'Copy ARM contract address'
                }
              >
                {armAddressCopied ? (
                  <CheckIcon className={styles.contractCopyIcon} aria-hidden />
                ) : (
                  <ClipboardDocumentIcon className={styles.contractCopyIcon} aria-hidden />
                )}
              </button>
            </div>
          ) : null}
        </div>
        <div className={styles.buttonRow}>
          <Button
            variant="secondary"
            size="md"
            label="Close"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
        </div>
      </FlowShell>
    )
  }

  if (step === 'submit') {
    const submitStepIndex = mode === 'refund' ? 1 : 2
    return (
      <FlowShell steps={steps} currentStep={submitStepIndex} flowLabel={armFlowLabel}>
        <div className={styles.submitContent}>
          <h2 className={styles.submitTitle}>
            Confirm transaction
            <br />
            on your wallet
          </h2>
          <div className={styles.txCard} aria-live="polite" aria-label="Transaction status">
            <div className={styles.txRow}>
              <span className={styles.txLabel}>
                {mode === 'refund' ? `Claim $${refundAmount.toLocaleString()} refund` : 'Claim ARM'}
              </span>
              <div className={styles.txStatus} aria-label="Loading">
                <div className={styles.spinner} role="status" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </FlowShell>
    )
  }

  if (step === 'intro') {
    return (
      <div className={styles.cardShell}>
        <div className={styles.cardContent}>
          <div className={styles.introHero}>
            <h2 className={styles.introTitle}>
              {mode === 'arm' ? 'Claim your ARM tokens' : 'Claim your USDC refund'}
            </h2>
            <div className={styles.introAllocation}>
              <p className={styles.introAllocEyebrow}>
                {mode === 'arm' ? 'Your allocation' : 'Your USDC refund'}
              </p>
              <p className={styles.introAllocValue}>
                {mode === 'arm' ? `${armLabel} ARM` : formatUsd(refundAmount || 1000)}
              </p>
            </div>
          </div>

          <div className={styles.howToClaim}>
            <p className={styles.howToClaimTitle}>How to claim</p>
            <ol className={styles.howToClaimList}>
              {mode === 'arm' ? (
                <>
                  <li>Select how to delegate your vote.</li>
                  <li>Review your claim.</li>
                  <li>Approve claim.</li>
                </>
              ) : (
                <>
                  <li>Review your refund.</li>
                  <li>Approve claim.</li>
                </>
              )}
            </ol>
          </div>
        </div>
        <div className={styles.buttonRow}>
          <Button
            variant="primary"
            size="lg"
            label="Start"
            showIcon={false}
            onClick={() => {
              setDelegateScreen('choice')
              setStep(mode === 'arm' ? 'delegate' : 'review')
            }}
          />
        </div>
      </div>
    )
  }

  if (step === 'delegate' && mode === 'arm') {
    if (delegateScreen === 'picker') {
      return (
        <FlowShell steps={steps} currentStep={1} flowLabel={armFlowLabel}>
          <div className={styles.cardContent}>
            <h2 className={styles.cardTitle}>Select a delegate</h2>
            <div className={styles.delegatePicker}>
              <label className={styles.searchLabel} htmlFor={searchId}>
                Search delegates
              </label>
              <div className={styles.searchField}>
                <MagnifyingGlassIcon className={styles.searchIcon} aria-hidden />
                <input
                  id={searchId}
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Name or address"
                  value={delegateQuery}
                  onChange={(e) => setDelegateQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <ul className={styles.delegateList} role="listbox" aria-label="Available delegates">
                {filteredDelegates.length === 0 ? (
                  <li className={styles.delegateEmpty}>No delegates match your search.</li>
                ) : (
                  filteredDelegates.map((candidate) => {
                    const selected = selectedDelegate?.address === candidate.address
                    return (
                      <li key={candidate.address}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={[
                            styles.delegateItem,
                            selected && styles.delegateItemSelected,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => setSelectedDelegate(candidate)}
                        >
                          <span className={styles.delegateItemPrimary}>
                            {candidate.ens ?? candidate.display}
                          </span>
                          {candidate.ens ? (
                            <span className={styles.delegateItemSecondary}>
                              {candidate.display}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Button
              variant="secondary"
              size="lg"
              label="Back"
              showIcon={false}
              onClick={() => setDelegateScreen('choice')}
            />
            <Button
              variant="primary"
              size="lg"
              label="Review"
              showIcon={false}
              className={!selectedDelegate ? styles.ctaBlocked : undefined}
              aria-disabled={!selectedDelegate || undefined}
              onClick={() => {
                if (!selectedDelegate) return
                setStep('review')
              }}
            />
          </div>
        </FlowShell>
      )
    }

    return (
      <FlowShell steps={steps} currentStep={1} flowLabel={armFlowLabel}>
        <div className={styles.cardContent}>
          <h2 className={styles.cardTitle}>Choose your delegate</h2>
          <fieldset className={styles.radioGroup}>
            <legend className={styles.visuallyHidden}>Delegation preference</legend>

            <label
              className={[
                styles.radioOption,
                delegateChoice === 'self' && styles.radioOptionSelected,
              ]
                .filter(Boolean)
                .join(' ')}
              htmlFor={selfRadioId}
            >
              <input
                id={selfRadioId}
                className={styles.radioInput}
                type="radio"
                name={radioName}
                checked={delegateChoice === 'self'}
                onChange={() => {
                  setDelegateChoice('self')
                  setSelectedDelegate(null)
                }}
              />
              <span className={styles.radioCopy}>
                <span className={styles.radioTitle}>Keep voting powers</span>
                <span className={styles.radioHint}>
                  Self-delegate — you vote with the ARM claimed to this wallet.
                </span>
              </span>
            </label>

            <label
              className={[
                styles.radioOption,
                delegateChoice === 'other' && styles.radioOptionSelected,
              ]
                .filter(Boolean)
                .join(' ')}
              htmlFor={otherRadioId}
            >
              <input
                id={otherRadioId}
                className={styles.radioInput}
                type="radio"
                name={radioName}
                checked={delegateChoice === 'other'}
                onChange={() => setDelegateChoice('other')}
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
          <Button
            variant="secondary"
            size="lg"
            label="Back"
            showIcon={false}
            onClick={() => {
              setDelegateScreen('choice')
              setStep('intro')
            }}
          />
          <Button
            variant="primary"
            size="lg"
            label={delegateChoice === 'other' ? 'Continue' : 'Review'}
            showIcon={false}
            onClick={() => {
              if (delegateChoice === 'other') {
                setDelegateScreen('picker')
                return
              }
              setStep('review')
            }}
          />
        </div>
      </FlowShell>
    )
  }

  // Review
  if (mode === 'refund') {
    return (
      <FlowShell steps={steps} currentStep={1}>
        <div className={styles.cardContent}>
          <h2 className={styles.cardTitle}>Claim your refund</h2>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>USDC refund</span>
              <span className={styles.summaryValueAccent}>
                ${refundAmount.toLocaleString()}
              </span>
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
          <Button
            variant="secondary"
            size="lg"
            label="Back"
            showIcon={false}
            onClick={() => setStep('intro')}
          />
          <Button
            variant="primary"
            size="lg"
            label={`Claim $${refundAmount.toLocaleString()} refund`}
            showIcon={false}
            onClick={() => setStep('submit')}
          />
        </div>
      </FlowShell>
    )
  }

  return (
    <FlowShell steps={steps} currentStep={2} flowLabel={armFlowLabel}>
      <div className={styles.cardContent}>
        <h2 className={styles.cardTitle}>Review claim</h2>
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
            <span className={styles.summaryValueAccent}>{armLabel} ARM</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              {delegateChoice === 'self' ? 'Self-delegate' : 'Delegate'}
            </span>
            <span className={styles.summaryValue}>{effectiveDelegateLabel}</span>
          </div>
          {claimUsdcRefund > 0 ? (
            <>
              <div className={styles.divider} />
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>USDC refund</span>
                <span className={styles.summaryValue}>
                  ${claimUsdcRefund.toLocaleString()}
                </span>
              </div>
            </>
          ) : null}
        </div>
        <div className={styles.warningBlock}>
          <p className={styles.warningText}>
            A single transaction delivers your ARM and sets your delegate.
          </p>
        </div>
      </div>
      <div className={styles.buttonRow}>
        <Button
          variant="secondary"
          size="lg"
          label="Back"
          showIcon={false}
          onClick={() => {
            setDelegateScreen(delegateChoice === 'other' ? 'picker' : 'choice')
            setStep('delegate')
          }}
        />
        <Button
          variant="primary"
          size="lg"
          label="Claim ARM"
          showIcon={false}
          onClick={() => setStep('submit')}
        />
      </div>
    </FlowShell>
  )
}
