import { ArrowRightIcon } from '@heroicons/react/24/solid'
import styles from './JoinButton.module.css'

interface JoinButtonProps {
  onClick: () => void
  /** @deprecated Always shows “Join now”; kept for callers. */
  expanded?: boolean
  size?: 'md' | 'lg'
}

export default function JoinButton({ onClick, size = 'md' }: JoinButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, size === 'lg' && styles.lg].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span className={styles.label}>Join now</span>
      <ArrowRightIcon className={styles.icon} aria-hidden />
    </button>
  )
}
