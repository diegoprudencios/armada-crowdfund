import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDownIcon, WalletIcon } from '@heroicons/react/24/solid'
import { ArmAllocationBlock } from '../ArmAllocationBlock/ArmAllocationBlock'
import NetworkArbitrumSepolia from '@web3icons/react/icons/networks/NetworkArbitrumSepolia'
import NetworkBaseSepolia from '@web3icons/react/icons/networks/NetworkBaseSepolia'
import NetworkSepolia from '@web3icons/react/icons/networks/NetworkSepolia'
import TokenUSDC from '@web3icons/react/icons/tokens/TokenUSDC'
import { hasActiveAmount, parseActiveAmount, sanitizeAmountInput } from '../../utils/amountInput'
import styles from './DepositAmountCard.module.css'

const ICON_SIZE = 32

export type DepositChainId = 'sepolia' | 'base' | 'arbitrum'

const CHAIN_OPTIONS: ReadonlyArray<{
  id: DepositChainId
  label: string
  Icon: typeof NetworkSepolia
}> = [
  { id: 'sepolia', label: 'Sepolia', Icon: NetworkSepolia },
  { id: 'base', label: 'Base', Icon: NetworkBaseSepolia },
  { id: 'arbitrum', label: 'Arbitrum', Icon: NetworkArbitrumSepolia },
]

export interface DepositAmountCardProps {
  chain?: DepositChainId
  onChainChange?: (chain: DepositChainId) => void
  token?: string
  amount: string
  onAmountChange: (value: string) => void
  balance?: string
  fee?: string
  onMax?: () => void
  /** When set, shows EST. ARM allocation below balance/fee after the user enters an amount. */
  maxArm?: number
  /** Prior committed USDC — fills the bar before the new deposit slice. Default 0. */
  existingCommittedUsdc?: number
}

export function DepositAmountCard({
  chain = 'sepolia',
  onChainChange,
  token = 'USDC',
  amount,
  onAmountChange,
  balance = '0.00',
  fee = '0.00',
  onMax,
  maxArm,
  existingCommittedUsdc = 0,
}: DepositAmountCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const chainRootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const amountInputId = useId()

  const selected =
    CHAIN_OPTIONS.find((option) => option.id === chain) ?? CHAIN_OPTIONS[0]
  const SelectedIcon = selected.Icon
  const chainSelectable = Boolean(onChainChange)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!chainRootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  function selectChain(next: DepositChainId) {
    onChainChange?.(next)
    setMenuOpen(false)
  }

  function handleAmountInput(raw: string) {
    const next = sanitizeAmountInput(raw)
    onAmountChange(hasActiveAmount(next) ? next : '')
  }

  const showActiveAmount = hasActiveAmount(amount)
  const showAllocation = showActiveAmount && maxArm != null && maxArm > 0
  const allocationCap = maxArm ?? 0
  const depositAmount = showAllocation
    ? parseActiveAmount(amount, Math.max(0, allocationCap - existingCommittedUsdc))
    : parseActiveAmount(amount)
  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.chainRoot} ref={chainRootRef}>
          {chainSelectable ? (
            <button
              type="button"
              className={styles.chainTrigger}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-controls={listboxId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className={styles.chainIconSlot} aria-hidden>
                <SelectedIcon size={ICON_SIZE} variant="branded" />
              </span>
              <span className={styles.chainName}>{selected.label}</span>
              <ChevronDownIcon className={styles.chevron} aria-hidden />
            </button>
          ) : (
            <div className={styles.chainTriggerStatic}>
              <span className={styles.chainIconSlot} aria-hidden>
                <SelectedIcon size={ICON_SIZE} variant="branded" />
              </span>
              <span className={styles.chainName}>{selected.label}</span>
            </div>
          )}

          {menuOpen && chainSelectable ? (
            <ul id={listboxId} className={styles.chainMenu} role="listbox" aria-label="Network">
              {CHAIN_OPTIONS.map((option) => {
                const OptionIcon = option.Icon
                const isSelected = option.id === chain
                return (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={styles.chainOption}
                      onClick={() => selectChain(option.id)}
                    >
                      <span className={styles.chainIconSlot} aria-hidden>
                        <OptionIcon size={ICON_SIZE} variant="branded" />
                      </span>
                      <span className={styles.chainOptionLabel}>{option.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <div className={styles.tokenGroup}>
          <span className={styles.tokenIconSlot} aria-hidden>
            <TokenUSDC size={ICON_SIZE} variant="branded" />
          </span>
          <span className={styles.tokenName}>{token}</span>
        </div>
      </div>

      <label className={styles.amountWrapper} htmlFor={amountInputId}>
        <span className={styles.visuallyHidden}>Deposit amount</span>
        <span
          className={[styles.amountField, showActiveAmount && styles.amountFieldHasValue]
            .filter(Boolean)
            .join(' ')}
        >
          <span
            className={[styles.amountDisplay, showActiveAmount && styles.amountDisplayActive]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            {showActiveAmount ? amount : '0'}
          </span>
          <input
            id={amountInputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className={styles.amountInput}
            value={amount}
            onChange={(e) => handleAmountInput(e.target.value)}
            aria-label="Deposit amount"
          />
        </span>
      </label>

      <div className={styles.footerStack}>
        <div className={styles.bottomRow}>
          <div className={styles.balanceGroup}>
            <WalletIcon className={styles.walletIcon} aria-hidden />
            <span className={styles.balanceText}>{balance}</span>
            {onMax ? (
              <button type="button" className={styles.maxBtn} onClick={onMax}>
                Max
              </button>
            ) : null}
          </div>
          <span className={styles.feeText}>
            FEE {fee} {token}
          </span>
        </div>

        {showAllocation ? (
          <ArmAllocationBlock
            maxArm={allocationCap}
            newAmount={depositAmount}
            existingCommittedUsdc={existingCommittedUsdc}
            tooltipDescription="Your estimated allocation based on the deposit amount."
            tooltipBullets={[
              '1 ARM per 1 USDC deposited',
              'Final allocation confirmed at close',
              'Subject to pool cap',
            ]}
          />
        ) : null}
      </div>
    </div>
  )
}
