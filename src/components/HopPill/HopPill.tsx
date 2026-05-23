import type { CSSProperties } from 'react'
import styles from './HopPill.module.css'

export type HopVariant = 'seed' | 'hop-1' | 'hop-2' | 'multi-hop'

const VARIANT_LABEL: Record<HopVariant, string> = {
  seed: 'SEED',
  'hop-1': 'HOP-1',
  'hop-2': 'HOP-2',
  'multi-hop': 'MULTI-HOP',
}

const DOT_COLOR: Record<HopVariant, string> = {
  seed: 'var(--semantic-color-brand-amber)',
  'hop-1': 'var(--semantic-color-brand-lavender)',
  'hop-2': 'var(--primitives-color-purple-300)',
  'multi-hop': 'var(--semantic-color-text-muted)',
}

interface HopPillProps {
  variant: HopVariant
  label?: string
}

export default function HopPill({ variant, label = 'Invited as' }: HopPillProps) {
  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    background: DOT_COLOR[variant],
  }

  return (
    <div className={styles.pill}>
      <span className={styles.label}>{label}</span>
      <span className={styles.tag}>
        <span className={styles.dot} style={dotStyle} aria-hidden />
        <span className={styles.tagLabel}>{VARIANT_LABEL[variant]}</span>
      </span>
    </div>
  )
}
