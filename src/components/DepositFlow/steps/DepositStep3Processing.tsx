import { useState } from 'react'
import { CheckIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import { Button } from '../../Button/Button'
import styles from './DepositStep3Processing.module.css'

export interface DepositStep3ProcessingProps {
  onCancel: () => void
}

type ChecklistVariant = 'complete' | 'active' | 'inactive'

interface ChecklistItem {
  label: string
  variant: ChecklistVariant
}

const CHECKLIST_ITEMS: ReadonlyArray<ChecklistItem> = [
  { label: 'Preparing transaction', variant: 'active' },
  { label: 'Submitting transaction', variant: 'inactive' },
  { label: 'Deposited', variant: 'inactive' },
]

const TECHNICAL_DETAILS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Record id', value: '01IKSZMT9MVT3SZ6XQ0ZI9XVFAP' },
  { label: 'Kind', value: 'shield' },
  { label: 'Stage', value: 'build-proof' },
  { label: 'Execution state', value: 'pending' },
]

function ChecklistIcon({ variant }: { variant: ChecklistVariant }) {
  if (variant === 'complete') {
    return (
      <span className={styles.iconComplete} aria-hidden>
        <CheckIcon width={12} height={12} />
      </span>
    )
  }
  if (variant === 'active') {
    return <span className={styles.iconActive} aria-hidden />
  }
  return <span className={styles.iconInactive} aria-hidden />
}

export function DepositStep3Processing({ onCancel }: DepositStep3ProcessingProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className={styles.content}>
      <div className={styles.statusRow}>
        <div className={styles.statusPill}>
          <span className={styles.statusDot} aria-hidden />
          <span className={styles.statusLabel}>Pending</span>
        </div>
        <span className={styles.eta}>Usually takes ~8 sec</span>
      </div>

      <ul className={styles.checklist}>
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item.label} className={styles.checkItem}>
            <ChecklistIcon variant={item.variant} />
            <span
              className={[
                styles.itemLabel,
                item.variant === 'inactive' ? styles.itemLabelInactive : styles.itemLabelActive,
              ].join(' ')}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <button
          type="button"
          className={styles.accordionToggle}
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <ChevronRightIcon
            className={[styles.chevron, detailsOpen && styles.chevronOpen].filter(Boolean).join(' ')}
            aria-hidden
          />
          Show technical details
        </button>
        {detailsOpen ? (
          <div className={styles.details}>
            {TECHNICAL_DETAILS.map((row) => (
              <div key={row.label} className={styles.detailRow}>
                <span className={styles.detailLabel}>{row.label}</span>
                <span className={styles.detailValue}>{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.cancelRow}>
        <Button
          variant="secondary"
          size="md"
          label="Cancel"
          showIcon={false}
          onClick={onCancel}
        />
      </div>
    </div>
  )
}
