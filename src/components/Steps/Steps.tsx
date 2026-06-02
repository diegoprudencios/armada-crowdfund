import styles from './Steps.module.css'

interface StepsProps {
  steps: string[]
  currentStep: number
  status?: 'default' | 'error' | 'confirmed'
  /** Fixed flow title (e.g. "Deposit") — when set, shown left instead of the active step name. */
  flowLabel?: string
}

export default function Steps({
  steps,
  currentStep,
  status = 'default',
  flowLabel,
}: StepsProps) {
  const stepName = flowLabel
    ? flowLabel.toUpperCase()
    : status === 'confirmed'
      ? 'CONFIRMATION'
      : (steps[currentStep - 1]?.toUpperCase() ?? '')
  const stepCount =
    status === 'confirmed'
      ? `STEP ${steps.length} OF ${steps.length}`
      : `STEP ${currentStep} OF ${steps.length}`

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <span className={styles.stepName}>{stepName}</span>
        <span className={styles.stepCount}>{stepCount}</span>
      </div>
      <div className={styles.progressBar}>
        {steps.map((_, index) => {
          const isActive = index < currentStep
          const className = [
            styles.segment,
            status === 'confirmed' && styles.confirmed,
            status === 'error' && isActive && styles.error,
            status === 'default' && isActive && styles.active,
          ]
            .filter(Boolean)
            .join(' ')

          return <div key={index} className={className} />
        })}
      </div>
    </div>
  )
}
