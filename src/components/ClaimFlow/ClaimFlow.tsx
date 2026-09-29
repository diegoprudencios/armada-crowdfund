// ABOUTME: Interactive claim flow — Intro → Delegate → Review → Submit → Done (ARM), or Intro → Review for refunds.
// ABOUTME: Mid-flow uses FlowChrome (back + title + close) to match the participate commit pattern.

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import {
  CheckIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '../Button'
import Tooltip from '../Tooltip/Tooltip'
import { FlowChrome } from '../ParticipateFlow/FlowChrome'
import styles from '../../pages/CrowdfundStages/ClaimFlowDemo.module.css'
import { WalletConfirmStep } from '../WalletConfirm'

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
  /** Close the claim modal (FlowChrome X). */
  onClose?: () => void
}

type FlowStep = 'intro' | 'delegate' | 'review' | 'submit' | 'done'
type DelegateChoice = 'self' | 'other'
type DelegateScreen = 'choice' | 'picker'

type DelegateCandidate = {
  address: string
  display: string
  ens?: string
}

const ARM_CLAIM_STEPS = [
  { label: 'Delegate', hint: 'Select how to delegate your vote' },
  { label: 'Review', hint: 'Confirm allocation and delegate' },
  { label: 'Confirm', hint: 'Approve claim in your wallet' },
] as const

const REFUND_CLAIM_STEPS = [
  { label: 'Review', hint: 'Confirm your USDC refund' },
  { label: 'Confirm', hint: 'Approve claim in your wallet' },
] as const

const ARM_KNOW_ITEMS = [
  'You’ll need a little ETH in this wallet for gas.',
  'A single transaction delivers your ARM and sets your delegate.',
  'Voting power starts once you claim and delegate.',
  'Any USDC above your final allocation is refunded in the same transaction.',
] as const

const REFUND_KNOW_ITEMS = [
  'You’ll need a little ETH in this wallet for gas.',
  'The sale ended under the minimum fund, so no ARM was sold.',
  'Your full committed USDC is returned in one transaction.',
] as const

/** Demo explorer base — Sepolia matches the committer’s public testnet. */
const DEMO_EXPLORER_BASE = 'https://sepolia.etherscan.io'

/** Stable demo tx hashes so Done → explorer works on revisit without a live RPC. */
const DEMO_CLAIM_TX_HASH: Record<ClaimFlowMode, string> = {
  arm: '0x7c3d8f2a1b9e4c6d5a0f8e7b6c5d4a3f2e1b0c9d8a7f6e5d4c3b2a1908171615',
  refund: '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80a',
}

function claimTxExplorerUrl(txHash: string): string {
  return `${DEMO_EXPLORER_BASE}/tx/${txHash}`
}

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
  titleId,
  onBack,
  onClose,
  showBack = true,
  children,
}: {
  title?: ReactNode
  titleId?: string
  onBack?: () => void
  onClose?: () => void
  showBack?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.cardShell}>
      <FlowChrome
        title={title}
        titleId={titleId}
        showBack={showBack && !!onBack}
        onBack={onBack}
        onClose={onClose}
        closeAriaLabel="Close claim flow"
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
  onClose,
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
  const [claimTxHash, setClaimTxHash] = useState<string | null>(() =>
    hasClaimed ? DEMO_CLAIM_TX_HASH[mode] : null,
  )

  const refundAmount = refundUsdc ?? committedUsdc
  const armLabel = armAmount.toLocaleString()
  const handleClose = onClose ?? onBackToCrowdfund

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
    setClaimTxHash(hasClaimed ? DEMO_CLAIM_TX_HASH[mode] : null)
  }, [hasClaimed, mode])

  useEffect(() => {
    if (step !== 'submit') return
    const hash = DEMO_CLAIM_TX_HASH[mode]
    setClaimTxHash(hash)
    const id = window.setTimeout(() => {
      onClaim()
      setStep('done')
    }, 1600)
    return () => window.clearTimeout(id)
  }, [step, onClaim, mode])

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
      <FlowShell title="Claim" showBack={false} onClose={handleClose}>
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
            size="lg"
            label="Back to crowdfund"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
          <Button
            variant="primary"
            size="lg"
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
      <FlowShell showBack={false} onClose={handleClose}>
        <div className={styles.cardContent}>
          <div className={styles.heroBlock}>
            <CheckCircleIcon className={styles.successIcon} aria-hidden />
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
          {claimTxHash ? (
            <Button
              variant="secondary"
              size="lg"
              label="View on explorer"
              showIcon={false}
              onClick={() =>
                window.open(claimTxExplorerUrl(claimTxHash), '_blank', 'noopener,noreferrer')
              }
            />
          ) : null}
          <Button
            variant="primary"
            size="lg"
            label="Close"
            showIcon={false}
            onClick={onBackToCrowdfund}
          />
        </div>
      </FlowShell>
    )
  }

  if (step === 'submit') {
    return (
      <FlowShell
        title="Confirm"
        onBack={() => setStep('review')}
        onClose={handleClose}
      >
        <WalletConfirmStep
          transactions={[
            {
              label:
                mode === 'refund'
                  ? `Claim $${refundAmount.toLocaleString()} refund`
                  : 'Claim ARM',
              status: 'loading',
            },
          ]}
        />
      </FlowShell>
    )
  }

  if (step === 'intro') {
    const claimSteps = mode === 'arm' ? ARM_CLAIM_STEPS : REFUND_CLAIM_STEPS
    const knowList = mode === 'arm' ? ARM_KNOW_ITEMS : REFUND_KNOW_ITEMS
    const finalCommit = committedUsdc || refundAmount || 1000

    return (
      <FlowShell
        title={mode === 'arm' ? 'Claim your ARM tokens' : 'Claim your USDC refund'}
        titleId="claim-intro-title"
        showBack={false}
        onClose={handleClose}
      >
        <div className={styles.introWrap}>
          <div className={styles.introScroll}>
            <ol
              className={[
                styles.stepCards,
                claimSteps.length === 2 ? styles.stepCardsTwo : undefined,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-labelledby="claim-intro-title"
            >
              {claimSteps.map((item, index) => (
                <li key={item.label} className={styles.stepCard}>
                  <span className={styles.stepNumber} aria-hidden>
                    {index + 1}
                  </span>
                  <div className={styles.stepCopy}>
                    <span className={styles.stepLabel}>{item.label}</span>
                    <span className={styles.stepHint}>{item.hint}</span>
                  </div>
                </li>
              ))}
            </ol>

            <div className={styles.factsCard}>
              {mode === 'arm' ? (
                <>
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>ARM allocation</span>
                    <span className={styles.factValueAccent}>{armLabel} ARM</span>
                  </div>
                  <div className={styles.divider} aria-hidden />
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>Final commit</span>
                    <span className={styles.factValue}>${finalCommit.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>USDC refund</span>
                    <span className={styles.factValueAccent}>
                      ${refundAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.divider} aria-hidden />
                  <div className={styles.factRow}>
                    <span className={styles.factLabel}>Final commit</span>
                    <span className={styles.factValue}>${finalCommit.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>

            <section className={styles.knowBlock} aria-labelledby="claim-intro-know">
              <h3 id="claim-intro-know" className={styles.knowHeading}>
                What to know
              </h3>
              <ul className={styles.knowList}>
                {knowList.map((text) => (
                  <li key={text} className={styles.knowItem}>
                    <span className={styles.knowBullet} aria-hidden>
                      ·
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className={styles.introFade} aria-hidden />
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
      </FlowShell>
    )
  }

  if (step === 'delegate' && mode === 'arm') {
    if (delegateScreen === 'picker') {
      return (
        <FlowShell
          title="Select a delegate"
          onBack={() => setDelegateScreen('choice')}
          onClose={handleClose}
        >
          <div className={[styles.cardContent, styles.cardContentFill].join(' ')}>
            <div className={styles.delegatePicker}>
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
                  aria-label="Search delegates"
                />
              </div>
              <ul className={styles.delegateList} role="listbox" aria-label="Available delegates">
                {filteredDelegates.length === 0 ? (
                  <li className={styles.delegateEmpty}>No delegates match your search.</li>
                ) : (
                  filteredDelegates.map((candidate) => {
                    const selected = selectedDelegate?.address === candidate.address
                    return (
                      <li key={candidate.address} className={styles.delegateListItem}>
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
                          <span className={styles.delegateItemSecondary}>
                            {candidate.ens ? candidate.display : '\u00a0'}
                          </span>
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
      <FlowShell
        title="Choose your delegate"
        onBack={() => {
          setDelegateScreen('choice')
          setStep('intro')
        }}
        onClose={handleClose}
      >
        <div className={styles.cardContent}>
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
      <FlowShell title="Review" onBack={() => setStep('intro')} onClose={handleClose}>
        <div className={styles.cardContent}>
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
    <FlowShell
      title="Review claim"
      onBack={() => {
        setDelegateScreen(delegateChoice === 'other' ? 'picker' : 'choice')
        setStep('delegate')
      }}
      onClose={handleClose}
    >
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
