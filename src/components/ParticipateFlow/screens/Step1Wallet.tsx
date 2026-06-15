import { useState } from 'react'
import styles from './Step1Wallet.module.css'
import Steps from '../../Steps/Steps'
import WalletItem from '../../WalletItem/WalletItem'
import Step1WalletNotWhitelisted from './Step1WalletNotWhitelisted'
import {
  isAddressWhitelisted,
  resolveDemoAddressForProvider,
} from '../participateFlowWallets'
import {
  WalletMetamask,
  WalletPhantom,
  WalletWalletConnect,
} from '@web3icons/react'
interface Step1WalletProps {
  onNext: (wallet: string) => void
  showSteps?: boolean
  compact?: boolean
}

const STEPS = ['Connect', 'Commit', 'Review', 'Confirmation']
const SELECT_EXIT_MS = 220

type WalletView = 'picker' | 'not-whitelisted'

export default function Step1Wallet({
  onNext,
  showSteps = true,
  compact = false,
}: Step1WalletProps) {
  const [view, setView] = useState<WalletView>('picker')
  const [rejectedAddress, setRejectedAddress] = useState<string | null>(null)
  const [exiting, setExiting] = useState(false)

  const handleSelect = (wallet: string) => {
    if (exiting) return

    const resolvedAddress = resolveDemoAddressForProvider(wallet)
    if (!resolvedAddress || !isAddressWhitelisted(resolvedAddress)) {
      setRejectedAddress(resolvedAddress ?? '0x0000000000000000000000000000000000000000')
      setView('not-whitelisted')
      return
    }

    setExiting(true)
    window.setTimeout(() => onNext(wallet), SELECT_EXIT_MS)
  }

  const handleSelectAnother = () => {
    setRejectedAddress(null)
    setView('picker')
    setExiting(false)
  }

  if (view === 'not-whitelisted' && rejectedAddress) {
    return (
      <Step1WalletNotWhitelisted
        address={rejectedAddress}
        onSelectAnother={handleSelectAnother}
      />
    )
  }

  return (
    <div
      data-flow-shell
      className={[
        styles.shell,
        compact && styles.shellCompact,
        exiting && styles.shellExit,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showSteps && <Steps steps={STEPS} currentStep={1} />}
      <div className={[styles.content, compact && styles.contentCompact].filter(Boolean).join(' ')}>
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
            onClick={() => handleSelect('metamask')}
          />
          <WalletItem
            name="Phantom"
            iconComponent={<WalletPhantom size={24} />}
            onClick={() => handleSelect('phantom')}
          />
          <WalletItem
            name="WalletConnect"
            iconComponent={<WalletWalletConnect size={24} />}
            onClick={() => handleSelect('walletconnect')}
          />
        </div>
      </div>
    </div>
  )
}
