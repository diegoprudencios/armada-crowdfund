import styles from './Tag.module.css'

export type TagDot = 'active' | 'warning' | 'error' | 'neutral' | 'lavender'

export interface TagProps {
  label: string
  dot?: TagDot
  className?: string
}

export function Tag({ label, dot, className }: TagProps) {
  return (
    <span className={[styles.tag, className].filter(Boolean).join(' ')}>
      {dot && <span className={[styles.dot, styles[dot]].join(' ')} />}
      {label}
    </span>
  )
}
