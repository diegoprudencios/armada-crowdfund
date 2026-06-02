import { Button } from '../../Button/Button'
import flowStyles from '../DepositFlow.module.css'
import styles from './DepositStep2Review.module.css'

export interface DepositStep2ReviewProps {
  amount: string
  chain: string
  onBack: () => void
  onConfirm: () => void
}

export function DepositStep2ReviewContent({
  amount,
  chain,
}: Pick<DepositStep2ReviewProps, 'amount' | 'chain'>) {
  return (
    <div className={styles.contentZone}>
      <p className={styles.eyebrow}>Review your deposit</p>
      <div className={styles.amountRow}>
        <span className={styles.amountValue}>{amount}</span>
        <span className={styles.amountUnit}>USDC</span>
      </div>
      <div className={styles.fromRow}>
        <span className={styles.fromLabel}>From</span>
        <span className={styles.fromValue}>{chain}</span>
      </div>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Estimated fee</span>
          <span className={styles.summaryValue}>No fee</span>
        </div>
        <hr className={styles.summaryDivider} />
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>You&apos;ll deposit</span>
          <span className={styles.summaryValue}>{amount} USDC</span>
        </div>
      </div>
    </div>
  )
}

export function DepositStep2ReviewFooter({
  onBack,
  onConfirm,
}: Pick<DepositStep2ReviewProps, 'onBack' | 'onConfirm'>) {
  return (
    <div className={flowStyles.buttonRow}>
      <Button
        variant="secondary"
        size="lg"
        label="Back"
        showIcon={false}
        onClick={onBack}
      />
      <Button
        variant="primary"
        size="lg"
        label="Confirm deposit"
        showIcon={false}
        onClick={onConfirm}
      />
    </div>
  )
}
