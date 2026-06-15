import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '../../Button'
import { truncateWalletAddress } from '../participateFlowWallets'
import styles from './Step1WalletNotWhitelisted.module.css'

interface Step1WalletNotWhitelistedProps {
  address: string
  onSelectAnother: () => void
}

export default function Step1WalletNotWhitelisted({
  address,
  onSelectAnother,
}: Step1WalletNotWhitelistedProps) {
  const displayAddress = truncateWalletAddress(address)

  return (
    <div className={styles.shell} data-flow-shell>
      <div className={styles.content}>
        <ExclamationCircleIcon className={styles.icon} aria-hidden />
        <h2 className={styles.title}>Address not whitelisted</h2>
        <p className={styles.body}>
          <span className={styles.address}>{displayAddress}</span> isn't on the allowlist for
          this crowdfund. Connect a different wallet to try another address.
        </p>
      </div>
      <div className={styles.buttonRow}>
        <Button
          variant="primary"
          size="lg"
          label="Connect a different wallet"
          showIcon={false}
          onClick={onSelectAnother}
        />
      </div>
    </div>
  )
}
