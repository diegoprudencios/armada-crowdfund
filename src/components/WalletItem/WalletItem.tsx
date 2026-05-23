import type { ReactNode } from 'react'
import styles from './WalletItem.module.css'

interface WalletItemProps {
  name: string
  iconSrc?: string
  iconComponent?: ReactNode
  balance?: string
  onClick: () => void
  disabled?: boolean
}

export default function WalletItem({
  name,
  iconSrc,
  iconComponent,
  balance,
  onClick,
  disabled = false,
}: WalletItemProps) {
  return (
    <button type="button" className={styles.item} onClick={onClick} disabled={disabled}>
      {iconComponent ? (
        <span className={styles.iconSlot}>{iconComponent}</span>
      ) : iconSrc ? (
        <img src={iconSrc} className={styles.icon} alt={name} />
      ) : (
        <div className={styles.iconPlaceholder} />
      )}
      <span className={styles.name}>{name}</span>
      {balance != null && balance !== '' && (
        <span className={styles.balance}>{balance}</span>
      )}
    </button>
  )
}
