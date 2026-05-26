import { useMemo, useState } from 'react'
import styles from './MyPositionSplit.module.css'
import { Header } from '../Header'
import { Tag } from '../Tag/Tag'
import { InformationCircleIcon } from '@heroicons/react/24/solid'
import Tooltip from '../Tooltip/Tooltip'
import SlotCard from '../InviteFlow/screens/SlotCard'
import { NodeSphere } from '../../pages/NodeSphere'
import {
  buildInvitePinnedNodes,
  COMMITTED,
  DEMO_SLOTS,
  DEMO_WALLET,
  DEMO_WALLET_DISPLAY,
  FILL_PCT,
  formatArmAllocation,
  formatUsdcCommitted,
  GRAPH_PARTICIPANTS,
  GRAPH_SEED,
} from './myPositionDemo'

export function MyPositionSplit() {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const invitePinnedNodes = useMemo(
    () => buildInvitePinnedNodes(DEMO_SLOTS, DEMO_WALLET, COMMITTED),
    [],
  )

  const handleGenerateLink = async (slotId: number) => {
    setLoadingId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    setLoadingId(null)
  }

  const handleCopy = (slotId: number, link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(slotId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async () => {}
  const handleInviteOnchain = async (slotId: number) => {
    setLoadingId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    setLoadingId(null)
  }

  return (
    <div className={styles.page}>
      <Header
        activeNav="myposition"
        walletAddress={DEMO_WALLET_DISPLAY}
        autoHideOnScroll={false}
      />

      <main className={styles.layout}>
        <section className={styles.graphColumn} aria-label="Invite graph">
          <div className={styles.sphereFrame}>
            <NodeSphere
              walletAddress={DEMO_WALLET}
              lockOnWallet
              inviteGraph
              highlightAddress={DEMO_WALLET}
              interactionDisabled={false}
              scenarioParticipants={GRAPH_PARTICIPANTS}
              scenarioSeed={GRAPH_SEED}
              pinnedNodes={invitePinnedNodes}
            />
          </div>
        </section>

        <aside className={styles.sidebarColumn} aria-label="Your position and invites">
          <div className={styles.sidebarStack}>
            <section className={styles.positionCard} aria-label="Your position">
              <div className={styles.cardHeader}>
                <h1 className={styles.pageTitle}>My Position</h1>
                <div className={styles.metaTags}>
                  <Tag label={DEMO_WALLET_DISPLAY} dot="lavender" />
                  <Tag label="HOP-1" dot="lavender" />
                </div>
              </div>

              <div className={styles.positionFooter}>
                <div className={styles.statsRow}>
                  <div className={styles.statBlock}>
                    <p className={styles.statLabel}>USDC committed</p>
                    <p className={styles.statAmount}>{formatUsdcCommitted()}</p>
                  </div>

                  <div className={styles.statBlock}>
                    <div className={styles.statLabelRow}>
                      <p className={styles.statLabel}>ARM allocation</p>
                      <Tooltip
                        variant="centered"
                        content="Estimated · pending finalization"
                      >
                        <button
                          type="button"
                          className={styles.infoTrigger}
                          aria-label="ARM allocation info"
                        >
                          <InformationCircleIcon className={styles.infoIcon} aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                    <p className={styles.statAmountAccent}>{formatArmAllocation()}</p>
                  </div>
                </div>

                <div className={styles.barSection}>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${FILL_PCT}%` }}
                    />
                  </div>
                  <div className={styles.barLabels}>
                    <span className={styles.barCaption}>{FILL_PCT}% of cap</span>
                    <span className={styles.barCaption}>Cap $10,000</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.inviteCard} aria-label="Your invites">
              <h2 className={styles.inviteTitle}>Your Invites</h2>
              <div className={styles.slotList}>
                {DEMO_SLOTS.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onGenerateLink={handleGenerateLink}
                    onCopy={handleCopy}
                    onRevoke={handleRevoke}
                    onInviteOnchain={handleInviteOnchain}
                    copied={copiedId === slot.id}
                    loading={loadingId === slot.id}
                  />
                ))}
              </div>
            </section>
          </div>
        </aside>
      </main>
    </div>
  )
}
