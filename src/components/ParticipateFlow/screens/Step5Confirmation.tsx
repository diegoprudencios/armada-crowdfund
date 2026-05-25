import styles from './Step5Confirmation.module.css'
import Steps from '../../Steps/Steps'
import { Button } from '../../Button'

interface Step5ConfirmationProps {
  onViewPosition: () => void
  onInvite: () => void
  amount?: number
  estimatedArm?: number
}

const STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']

export default function Step5Confirmation({
  onViewPosition,
  onInvite,
  amount = 1000,
  estimatedArm = 1000,
}: Step5ConfirmationProps) {
  const formattedAmount = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return (
    <div className={styles.shell}>
      <Steps steps={STEPS} currentStep={4} status="confirmed" />

      <div className={styles.content}>
        <div className={styles.heroBlock}>
          <h1 className={styles.headline}>You're in.</h1>
          <p className={styles.subline}>
            {formattedAmount} USDC committed.<br />
            Up to {estimatedArm.toLocaleString()} ARM reserved for you.
          </p>
        </div>

        <div className={styles.nextCard}>
          <span className={styles.nextEyebrow}>WHAT HAPPENS NEXT</span>
          <p className={styles.nextText}>
            The window stays open for 3 weeks. When it closes, your ARM
            allocation is calculated and you can claim your tokens.
          </p>
        </div>
      </div>

      <div className={styles.buttonRow}>
        <Button
          variant="secondary"
          size="lg"
          label="View your position"
          showIcon={false}
          onClick={onViewPosition}
        />
        <Button
          variant="primary"
          size="lg"
          label="Invite participants"
          showIcon={false}
          onClick={onInvite}
        />
      </div>
    </div>
  )
}
