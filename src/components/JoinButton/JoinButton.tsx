import { ArrowRightIcon } from '@heroicons/react/24/solid'
import styles from './JoinButton.module.css'

interface JoinButtonProps {
  onClick: () => void
  /** When true, shows the expanded “Join now” state (e.g. parent card hover). */
  expanded?: boolean
}

export default function JoinButton({ onClick, expanded = false }: JoinButtonProps) {
  return (
    <button
      className={[styles.button, expanded && styles.expanded].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span className={styles.label}>Join now</span>
      <ArrowRightIcon className={styles.icon} />
    </button>
  )
}
