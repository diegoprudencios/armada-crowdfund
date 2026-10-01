// ABOUTME: Self-fill “Commit the maximum” banner — mirrors committer MaxOutBanner above participate shells.

import { Button } from '../../Button'
import Tooltip from '../../Tooltip/Tooltip'
import styles from './MaxOutBanner.module.css'

export interface MaxOutBannerOption {
  /** Theoretical ceiling reachable via self-fill (USD). */
  ceilingUsd: number
  /** New USDC the bundle would commit now (USD). */
  newCommitUsd: number
  /** Number of self-invites the bundle would issue. */
  inviteCount: number
  onMaxOut: () => void
  loading?: boolean
  balanceLimited?: boolean
  error?: string
}

export function MaxOutBanner({ maxOut }: { maxOut: MaxOutBannerOption }) {
  const { ceilingUsd, newCommitUsd, inviteCount, onMaxOut, loading, balanceLimited, error } =
    maxOut
  const commitUsd = `$${newCommitUsd.toLocaleString()}`
  const invitePhrase = `${inviteCount} self-invite${inviteCount === 1 ? '' : 's'}`
  const subtitle = balanceLimited
    ? inviteCount > 0
      ? `Top up your wallet to bundle ${invitePhrase} and commit ${commitUsd} across all your hops.`
      : `Top up your wallet to commit ${commitUsd} across all your hops.`
    : inviteCount > 0
      ? `Bundle ${invitePhrase} + per-hop commits (${commitUsd}) into one transaction.`
      : `Commit ${commitUsd} across all your hops in one transaction.`

  const button = (
    <Button
      className={styles.cta}
      variant="gradient"
      size="md"
      label={loading ? 'Preparing…' : 'Max out'}
      showIcon={false}
      disabled={loading || balanceLimited}
      onClick={onMaxOut}
    />
  )

  return (
    <div className={styles.banner} role="region" aria-label="Commit the maximum">
      <div className={styles.copy}>
        <p className={styles.title}>
          Commit the maximum — up to ${ceilingUsd.toLocaleString()}
        </p>
        <p className={styles.subtitle}>{subtitle}</p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {balanceLimited && !loading ? (
        <Tooltip variant="centered" content="Insufficient balance">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </div>
  )
}
