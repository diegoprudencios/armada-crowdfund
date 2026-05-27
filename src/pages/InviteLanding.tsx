import { useMemo, useState } from 'react'
import { ArmadaLogo } from '../components/ArmadaLogo'
import { Button } from '../components/Button'
import type { HopVariant } from '../components/HopPill/HopPill'
import {
  ParticipateFlowInviteLink,
  type ParticipateFlowInviteLinkCloseContext,
} from '../components/ParticipateFlow/ParticipateFlowInviteLink'
import Step0Invite from '../components/ParticipateFlow/steps/Step0Invite/Step0Invite'
import { DemoSessionProvider, useDemoSession } from '../context/DemoSessionContext'
import styles from './InviteLanding.module.css'

const CROWDFUND_URL = import.meta.env.BASE_URL
const MY_POSITION_URL = `${import.meta.env.BASE_URL}?view=myposition`
const DEFAULT_DAYS_LEFT = 3

function parseHopVariant(raw: string | null): HopVariant {
  const key = raw?.toLowerCase().replace(/_/g, '-') ?? ''
  const map: Record<string, HopVariant> = {
    seed: 'seed',
    'hop-1': 'hop-1',
    hop1: 'hop-1',
    'hop-2': 'hop-2',
    hop2: 'hop-2',
    'multi-hop': 'multi-hop',
    multihop: 'multi-hop',
  }
  return map[key] ?? 'hop-1'
}

function InviteLandingInner() {
  const {
    walletConnected,
    hasParticipated,
    committedUsdc,
    hopVariant: sessionHop,
    slots,
    connectWallet,
    completeParticipation,
    generateSlotLink,
    revokeSlot,
    inviteSlotOnchain,
    loadingSlotId,
  } = useDemoSession()

  const [flowActive, setFlowActive] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const hopVariant = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('hop')
    if (fromUrl) return parseHopVariant(fromUrl)
    return sessionHop
  }, [sessionHop])

  const daysLeft = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('days')
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAYS_LEFT
  }, [])

  const handleCopy = (slotId: number, link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(slotId)
    window.setTimeout(() => setCopiedId(null), 2000)
  }

  const openFlow = () => setFlowActive(true)

  const closeFlow = ({ step }: ParticipateFlowInviteLinkCloseContext) => {
    if (step === 'invites') {
      window.location.assign(MY_POSITION_URL)
      return
    }
    setFlowActive(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <ArmadaLogo />
      </div>

      <div className={styles.stack}>
        {flowActive ? (
          <ParticipateFlowInviteLink
            presentation="inline"
            open
            onClose={closeFlow}
            walletConnected={walletConnected}
            onConnectWallet={connectWallet}
            onCompleteParticipation={completeParticipation}
            onViewPosition={() => window.location.assign(MY_POSITION_URL)}
            hasParticipated={hasParticipated}
            committedUsdc={committedUsdc}
            hopVariant={hopVariant}
            slots={slots}
            onGenerateSlotLink={generateSlotLink}
            onRevokeSlot={revokeSlot}
            onInviteSlotOnchain={inviteSlotOnchain}
            onCopySlotLink={handleCopy}
            loadingSlotId={loadingSlotId}
            copiedSlotId={copiedId}
          />
        ) : (
          <Step0Invite
            variant="landing"
            hopVariant={hopVariant}
            daysLeft={daysLeft}
            onJoin={openFlow}
          />
        )}

        {!flowActive && (
          <footer className={styles.footer}>
            <p className={styles.footerPrompt}>Not ready to participate yet?</p>
            <div className={styles.footerNav}>
              <Button
                variant="secondary"
                size="lg"
                label="The project"
                showIcon={false}
                className={styles.footerBtn}
                onClick={() => window.open('https://armada.wtf', '_blank', 'noopener,noreferrer')}
              />
              <Button
                variant="secondary"
                size="lg"
                label="Crowdfund"
                showIcon={false}
                className={styles.footerBtn}
                onClick={() => window.location.assign(CROWDFUND_URL)}
              />
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

export function InviteLanding() {
  return (
    <DemoSessionProvider>
      <InviteLandingInner />
    </DemoSessionProvider>
  )
}
