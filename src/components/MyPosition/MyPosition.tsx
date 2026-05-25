import { useMemo, useState } from 'react'
import styles from './MyPosition.module.css'
import { Header } from '../Header'
import { Tag } from '../Tag/Tag'
import Tooltip from '../Tooltip/Tooltip'
import SlotCard, { type SlotData } from '../InviteFlow/screens/SlotCard'
import { NodeSphere, type PinnedNode } from '../../pages/NodeSphere'

const COMMITTED = 4000
const CAP = 10000
const FILL_PCT = (COMMITTED / CAP) * 100
const GRAPH_SEED = 42
const GRAPH_PARTICIPANTS = 5 as const
const DEMO_WALLET = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a3c'
const DEMO_WALLET_DISPLAY = '0x1a2b...9a3c'

const DEMO_SLOTS: SlotData[] = [
  {
    id: 1,
    status: 'redeemed',
    redeemedBy: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  },
  {
    id: 2,
    status: 'link-active',
    link: 'https://armada.wtf/join?invite=abc123&hop=hop-1',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  { id: 3, status: 'empty' },
]

export function MyPosition() {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const invitePinnedNodes = useMemo((): PinnedNode[] => {
    const nodes: PinnedNode[] = [
      {
        kind: 'Your wallet',
        address: DEMO_WALLET,
        committed: '$4,000 committed',
      },
    ]
    const redeemed = DEMO_SLOTS.find((s) => s.status === 'redeemed' && s.redeemedBy)
    if (redeemed?.redeemedBy) {
      nodes.push({
        kind: 'Hop 1',
        address: redeemed.redeemedBy,
        committed: 'Joined',
      })
    }
    nodes.push({
      kind: 'Hop 1',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      committed: 'Pending invite',
    })
    return nodes
  }, [])

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

      <div className={styles.shell}>
        <main className={styles.main}>
          <div className={styles.topRow}>
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
                  <div>
                    <p className={styles.statLabel}>USDC committed</p>
                    <p className={styles.statAmount}>$4,000</p>
                  </div>

                  <div>
                    <div className={styles.statLabelRow}>
                      <p className={styles.statLabel}>ARM allocation</p>
                      <Tooltip
                        variant="centered"
                        content="Estimated · pending finalization"
                      >
                        <span className={styles.infoTrigger} aria-label="ARM allocation info">
                          <span className={styles.infoIcon} aria-hidden="true">i</span>
                        </span>
                      </Tooltip>
                    </div>
                    <p className={styles.statAmountAccent}>12,500</p>
                  </div>
                </div>

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

          <section className={styles.graphSection} aria-label="Invite graph">
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
        </main>
      </div>
    </div>
  )
}
