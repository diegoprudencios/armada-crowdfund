import styles from './Step1Wallet.module.css'
import Steps from '../../Steps/Steps'
import WalletItem from '../../WalletItem/WalletItem'
import {
  WalletMetamask,
  WalletPhantom,
  WalletWalletConnect,
} from '@web3icons/react'

interface Step1WalletProps {
  onNext: (wallet: string) => void
}

const STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']

export default function Step1Wallet({ onNext }: Step1WalletProps) {
  return (
    <div className={styles.shell}>
      <Steps steps={STEPS} currentStep={1} />
      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h2 className={styles.title}>Select your wallet</h2>
          <p className={styles.subtitle}>
            Connect your wallet to verify your invite and see your allocation.
          </p>
        </div>
        <div className={styles.walletList}>
          <WalletItem
            name="MetaMask"
            iconComponent={<WalletMetamask size={24} />}
            onClick={() => onNext('metamask')}
          />
          <WalletItem
            name="Phantom"
            iconComponent={<WalletPhantom size={24} />}
            onClick={() => onNext('phantom')}
          />
          <WalletItem
            name="WalletConnect"
            iconComponent={<WalletWalletConnect size={24} />}
            onClick={() => onNext('walletconnect')}
          />
        </div>
      </div>
    </div>
  )
}
