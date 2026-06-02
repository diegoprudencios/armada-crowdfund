import { Button } from '../../Button/Button'
import {
  DepositAmountCard,
  type DepositChainId,
} from '../../DepositAmountCard/DepositAmountCard'
import { hasActiveAmount } from '../../../utils/amountInput'
import flowStyles from '../DepositFlow.module.css'
import styles from './DepositStep1Amount.module.css'

export interface DepositStep1AmountProps {
  amount: string
  onAmountChange: (value: string) => void
  chain?: DepositChainId
  onChainChange?: (chain: DepositChainId) => void
  balance: string
  fee: string
  onMax: () => void
  onCancel: () => void
  onContinue: () => void
}

export function DepositStep1AmountContent({
  amount,
  onAmountChange,
  chain,
  onChainChange,
  balance,
  fee,
  onMax,
}: Pick<
  DepositStep1AmountProps,
  'amount' | 'onAmountChange' | 'chain' | 'onChainChange' | 'balance' | 'fee' | 'onMax'
>) {
  return (
    <div className={styles.contentZone}>
      <p className={styles.question}>How much USDC you want to deposit?</p>
      <DepositAmountCard
        chain={chain}
        onChainChange={onChainChange}
        amount={amount}
        onAmountChange={onAmountChange}
        balance={balance}
        fee={fee}
        onMax={onMax}
      />
    </div>
  )
}

export function DepositStep1AmountFooter({
  amount,
  onCancel,
  onContinue,
}: Pick<DepositStep1AmountProps, 'amount' | 'onCancel' | 'onContinue'>) {
  const canContinue = hasActiveAmount(amount)

  return (
    <div className={flowStyles.buttonRow}>
      <Button
        variant="secondary"
        size="lg"
        label="Cancel"
        showIcon={false}
        onClick={onCancel}
      />
      <Button
        variant="primary"
        size="lg"
        label="Review"
        showIcon={false}
        disabled={!canContinue}
        onClick={onContinue}
      />
    </div>
  )
}
