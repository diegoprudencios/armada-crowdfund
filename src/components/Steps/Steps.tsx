import styles from './Steps.module.css'

interface StepsProps {
  steps: string[]
  currentStep: number
  status?: 'default' | 'error' | 'confirmed'
}

export default function Steps({ steps, currentStep, status = 'default' }: StepsProps) {
  const stepName = steps[currentStep - 1]?.toUpperCase() ?? ''
  const stepCount = `STEP ${currentStep} OF ${steps.length}`

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
            isActive && styles.active,
            isActive && status === 'error' && styles.error,
          ]
            .filter(Boolean)
            .join(' ')

          return <div key={index} className={className} />
        })}
      </div>
    </div>
  )
}
