import { Button } from '../Button'
import styles from './MyPositionEmptyState.module.css'

export type MyPositionEmptyStateKind = 'disconnected' | 'no-position'

export interface MyPositionEmptyStateProps {
  kind: MyPositionEmptyStateKind
  /** Fires when the disconnected-state's "Connect wallet" CTA is clicked. */
  onConnectWallet?: () => void
  /** Fires when the no-position-state's "Participate" CTA is clicked. */
  onParticipate?: () => void
}

const COPY: Record<MyPositionEmptyStateKind, { headline: string; subhead: string; cta: string }> = {
  disconnected: {
    headline: 'Connect your wallet',
    subhead: 'Connect a wallet to see your committed USDC, ARM allocation, and invite tree.',
    cta: 'Connect wallet',
  },
  'no-position': {
    headline: 'No position yet',
    subhead: "You haven't been invited to a hop or committed USDC yet.",
    // No body CTA — Participate stays on the card header / hero (POC parity).
    cta: '',
  },
}

export function MyPositionEmptyState({
  kind,
  onConnectWallet,
  onParticipate,
}: MyPositionEmptyStateProps) {
  const copy = COPY[kind]
  const onClick = kind === 'disconnected' ? onConnectWallet : onParticipate
  const showCta = copy.cta !== '' && !!onClick
  return (
    <div className={styles.body}>
      <h2 className={styles.headline}>{copy.headline}</h2>
      <p className={styles.subhead}>{copy.subhead}</p>
      {showCta ? (
        <div className={styles.ctaRow}>
          <Button
            variant="gradient"
            size="md"
            label={copy.cta}
            showIcon
            icon="arrow-right-micro"
            onClick={onClick}
          />
        </div>
      ) : null}
    </div>
  )
}
