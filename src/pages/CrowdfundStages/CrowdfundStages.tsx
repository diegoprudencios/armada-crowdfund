import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import type { SlotData } from '../../components/InviteFlow/screens/SlotCard'
import { InvitesCard } from '../../components/MyPosition/InvitesCard'
import { DEMO_INVITE_ALLOWANCE, DEMO_SLOTS } from '../../components/MyPosition/myPositionDemo'
import {
  nextInviteId,
  type InviteAllowance,
  type InviteeHop,
} from '../../components/MyPosition/inviteModel'
import { Participate } from '../../components/Participate'
import { Progress } from '../../components/Progress'
import {
  ParticipateFlowCrowdfund,
  ParticipateFlowModal,
} from '../../components/ParticipateFlow'
import { ParticipateFlowInviteSlots } from '../../components/ParticipateFlow/ParticipateFlowInviteSlots'
import Step0Invite from '../../components/ParticipateFlow/steps/Step0Invite/Step0Invite'
import Step1WalletNotWhitelisted from '../../components/ParticipateFlow/screens/Step1WalletNotWhitelisted'
import Step2Commit from '../../components/ParticipateFlow/screens/Step2Commit'
import Step3Review from '../../components/ParticipateFlow/screens/Step3Review'
import Step4Approve from '../../components/ParticipateFlow/screens/Step4Approve'
import Step5Confirmation from '../../components/ParticipateFlow/screens/Step5Confirmation'
import {
  MaxOutBanner,
  type MaxOutBannerOption,
} from '../../components/ParticipateFlow/screens/MaxOutBanner'
import { hopPillDotColor } from '../../constants/graphHopColors'
import {
  ClaimFlowDemo,
  CLAIM_DEMO_LABELS,
  CLAIM_DEMO_SCREENS,
  type ClaimDemoScreen,
} from './ClaimFlowDemo'
import {
  PositionCardDemo,
  type PositionCardDemoVariant,
} from './PositionCardDemo'
import styles from './CrowdfundStages.module.css'

type ModalKind =
  | { kind: 'participate-step'; step: ParticipateStepId }
  | { kind: 'claim'; screen: ClaimDemoScreen }
  | { kind: 'participate-flow' }
  | { kind: 'invite-slots' }

/** Fresh post-commit modal: no issued invites yet; allowance drives hop rows. */
const EMPTY_INVITE_SLOTS: SlotData[] = []
const MODAL_INVITE_ALLOWANCE = { hop1: 3, hop2: 0 } as const

type ParticipateStepId =
  | 'invite'
  | 'not-whitelisted'
  | 'commit'
  | 'commit-max-out'
  | 'review'
  | 'review-max-out'
  | 'approve'
  | 'confirmation'
  | 'confirmation-again'
  | 'confirmation-max-out'
  | 'confirmation-no-invites'

/** Demo self-fill plan — hop-0 seed: MAX $15k current, Max out $33k / 9 self-invites. */
const DEMO_MAX_OUT_WITH_INVITES: Omit<MaxOutBannerOption, 'onMaxOut'> = {
  ceilingUsd: 33_000,
  newCommitUsd: 33_000,
  inviteCount: 9,
}

const DEMO_MAX_OUT_HOP_COMMITS = [
  {
    hop: 0 as const,
    hopLabel: 'HOP-0',
    hopColor: hopPillDotColor('seed'),
    amount: 15_000,
  },
  {
    hop: 1 as const,
    hopLabel: 'HOP-1',
    hopColor: hopPillDotColor('hop-1'),
    amount: 12_000,
  },
  {
    hop: 2 as const,
    hopLabel: 'HOP-2',
    hopColor: hopPillDotColor('hop-2'),
    amount: 6_000,
  },
]

const DEMO_MAX_OUT_NOTE = (
  <>
    <strong>Self-invite bundle.</strong> Issues 9 self-invites to unlock your full ceiling,
    then commits at every hop — all in one transaction. This spends your own invite slots
    on yourself, so they won&apos;t be available to invite others.
  </>
)

function withMaxOutBanner(
  maxOut: Omit<MaxOutBannerOption, 'onMaxOut'>,
  onMaxOut: () => void,
  children: ReactNode,
) {
  return (
    <div className={styles.maxOutStack}>
      <MaxOutBanner maxOut={{ ...maxOut, onMaxOut }} />
      {children}
    </div>
  )
}

const PARTICIPATE_STEPS: { id: ParticipateStepId; label: string }[] = [
  { id: 'invite', label: 'Step 0 — Invite' },
  { id: 'not-whitelisted', label: 'Not allowlisted' },
  { id: 'commit', label: 'Step 1 — Commit' },
  { id: 'commit-max-out', label: 'Step 1 — Commit + max out' },
  { id: 'review', label: 'Step 2 — Review' },
  { id: 'review-max-out', label: 'Step 2 — Review max out' },
  { id: 'approve', label: 'Step 3 — Approve' },
  { id: 'confirmation', label: 'Step 4 — Confirmation' },
  { id: 'confirmation-again', label: 'Step 4 — Commit again' },
  { id: 'confirmation-max-out', label: 'Step 4 — Confirmation (full commit)' },
  { id: 'confirmation-no-invites', label: 'Step 4 — No invites (Hop-2)' },
]

const POSITION_VARIANTS: { variant: PositionCardDemoVariant; label: string; note: string }[] = [
  {
    variant: 'open-no-commit',
    label: 'Open · not committed',
    note: 'Same layout · $0 / empty bar · Participate',
  },
  {
    variant: 'open-committed',
    label: 'Open · committed',
    note: 'CTA: Commit again',
  },
  {
    variant: 'closed-committed',
    label: 'Closed · committed',
    note: 'No CTA (window closed)',
  },
  {
    variant: 'finalized-arm',
    label: 'Finalized · ARM allocation',
    note: 'Pending claim · purple Claim CTA',
  },
  {
    variant: 'finalized-refund',
    label: 'Finalized · USDC refund',
    note: 'Pending claim · purple Claim refund CTA',
  },
  {
    variant: 'claimed',
    label: 'Claimed',
    note: 'CLAIMED tag',
  },
]

const NAV = [
  { href: '#crowdfund-cards', label: 'Crowdfund cards' },
  { href: '#my-position', label: 'My Position' },
  { href: '#invites', label: 'Invites' },
  { href: '#participate-flow', label: 'Participate' },
  { href: '#claim-flow', label: 'Claim' },
]

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={styles.sectionHead}>
        <h2 id={`${id}-title`} className={styles.sectionTitle}>
          {title}
        </h2>
        <p className={styles.sectionDesc}>{description}</p>
      </div>
      {children}
    </section>
  )
}

function StateCard({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: ReactNode
}) {
  return (
    <figure className={styles.stateCard}>
      <figcaption className={styles.stateMeta}>
        <span className={styles.stateLabel}>{label}</span>
        {note ? <span className={styles.stateNote}>{note}</span> : null}
      </figcaption>
      <div className={styles.stateBody}>{children}</div>
    </figure>
  )
}

function ParticipateStepContent({
  step,
  onClose,
}: {
  step: ParticipateStepId
  onClose: () => void
}) {
  switch (step) {
    case 'invite':
      return (
        <Step0Invite
          hopVariant="hop-1"
          daysLeft={3}
          onJoin={onClose}
          variant="landing"
        />
      )
    case 'not-whitelisted':
      return (
        <Step1WalletNotWhitelisted
          address="0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef"
          onSelectAnother={onClose}
        />
      )
    case 'commit':
      return (
        <Step2Commit
          onNext={onClose}
          onBack={onClose}
          showBack={false}
          maxAmount={15_000}
          hopLabel="Hop-0"
        />
      )
    case 'commit-max-out':
      return withMaxOutBanner(DEMO_MAX_OUT_WITH_INVITES, onClose, (
        <Step2Commit
          onNext={onClose}
          onBack={onClose}
          showBack={false}
          maxAmount={15_000}
          hopLabel="Hop-0"
        />
      ))
    case 'review':
      return (
        <Step3Review
          onNext={onClose}
          onBack={onClose}
          hopLevel="Hop 1"
          amount={1000}
          estimatedArm={1000}
        />
      )
    case 'review-max-out':
      return (
        <Step3Review
          onNext={onClose}
          onBack={onClose}
          hopCommits={DEMO_MAX_OUT_HOP_COMMITS}
          amount={6_000}
          estimatedArm={6_000}
          note={DEMO_MAX_OUT_NOTE}
        />
      )
    case 'approve':
      return <Step4Approve onDone={onClose} amount={1000} />
    case 'confirmation':
      return (
        <Step5Confirmation
          showViewPositionButton
          onViewPosition={onClose}
          onInvite={onClose}
          amount={1000}
          estimatedArm={1000}
        />
      )
    case 'confirmation-again':
      return (
        <Step5Confirmation
          isAdditionalCommit
          showViewPositionButton
          onViewPosition={onClose}
          onInvite={onClose}
          amount={500}
          estimatedArm={500}
          totalCommittedUsdc={1500}
        />
      )
    case 'confirmation-max-out':
      return (
        <Step5Confirmation
          showViewPositionButton
          onViewPosition={onClose}
          onInvite={onClose}
          amount={1000}
          estimatedArm={1000}
        />
      )
    case 'confirmation-no-invites':
      return (
        <Step5Confirmation
          canInvite={false}
          showViewPositionButton
          onViewPosition={onClose}
          onBackToCrowdfund={onClose}
          amount={1000}
          estimatedArm={1000}
        />
      )
  }
}

export function CrowdfundStages() {
  const [modal, setModal] = useState<ModalKind | null>(null)
  const [positionSlots, setPositionSlots] = useState<SlotData[]>(() =>
    DEMO_SLOTS.map((slot) => ({ ...slot })),
  )
  const [modalSlots, setModalSlots] = useState<SlotData[]>(() =>
    EMPTY_INVITE_SLOTS.map((slot) => ({ ...slot })),
  )
  const [modalInviteAllowance, setModalInviteAllowance] = useState<InviteAllowance>({
    ...MODAL_INVITE_ALLOWANCE,
  })
  const [copiedSlotId, setCopiedSlotId] = useState<number | null>(null)
  const [loadingSlotId, setLoadingSlotId] = useState<number | null>(null)
  const [loadingHop, setLoadingHop] = useState<InviteeHop | null>(null)
  const closeModal = () => setModal(null)

  const openParticipateFlow = () => {
    setModalSlots(EMPTY_INVITE_SLOTS.map((slot) => ({ ...slot })))
    setModalInviteAllowance({ ...MODAL_INVITE_ALLOWANCE })
    setCopiedSlotId(null)
    setLoadingSlotId(null)
    setModal({ kind: 'participate-flow' })
  }

  const handleGenerateLinkForHop = async (
    setSlots: typeof setPositionSlots,
    hop: InviteeHop,
  ) => {
    setLoadingHop(hop)
    await new Promise((r) => setTimeout(r, 800))
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const link = `https://armada.wtf/join?invite=${Math.random().toString(36).slice(2, 10)}&hop=hop-${hop}`
    let createdId = 0
    setSlots((prev) => {
      createdId = nextInviteId(prev)
      return [
        {
          id: createdId,
          status: 'link-active' as const,
          link,
          expiresAt,
          inviteeHop: hop,
          invitedAt: new Date(),
        },
        ...prev,
      ]
    })
    setLoadingHop(null)
    return { id: createdId, link, expiresAt }
  }

  const handleGenerateLink = async (
    setSlots: typeof setPositionSlots,
    slotId: number,
  ) => {
    setLoadingSlotId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const link = `https://armada.wtf/join?invite=${Math.random().toString(36).slice(2, 10)}&hop=hop-1`
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'link-active', link, expiresAt, inviteeHop: 1 }
          : s,
      ),
    )
    setLoadingSlotId(null)
  }

  const handleCopy = (slotId: number, link: string) => {
    void navigator.clipboard.writeText(link)
    setCopiedSlotId(slotId)
    setTimeout(() => setCopiedSlotId(null), 1200)
  }

  const handleRevoke = async (setSlots: typeof setPositionSlots, slotId: number) => {
    await new Promise((r) => setTimeout(r, 600))
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, status: 'revoked' as const, closedAt: new Date() }
          : s,
      ),
    )
  }

  /** SlotCard / participate modal — reset to empty (legacy fixed-slot UX). */
  const handleRevokeToEmpty = (setSlots: typeof setPositionSlots, slotId: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { id: s.id, status: 'empty' as const } : s)),
    )
  }

  const handleInviteOnchainForHop = async (
    setSlots: typeof setPositionSlots,
    hop: InviteeHop,
    address: string,
    ensName?: string,
  ) => {
    setLoadingHop(hop)
    await new Promise((r) => setTimeout(r, 800))
    setSlots((prev) => [
      {
        id: nextInviteId(prev),
        status: 'onchain-pending',
        invitedAddress: address,
        ensName,
        inviteeHop: hop,
        invitedAt: new Date(),
      },
      ...prev,
    ])
    setLoadingHop(null)
  }

  const handleInviteOnchain = async (
    setSlots: typeof setPositionSlots,
    slotId: number,
    address: string,
    ensName?: string,
  ) => {
    setLoadingSlotId(slotId)
    await new Promise((r) => setTimeout(r, 800))
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              status: 'onchain-pending',
              invitedAddress: address,
              ensName,
              inviteeHop: 1,
              invitedAt: new Date(),
            }
          : s,
      ),
    )
    setLoadingSlotId(null)
  }

  const modalAria =
    modal?.kind === 'participate-flow'
      ? 'Participate in the Armada crowdfund'
      : modal?.kind === 'invite-slots'
        ? 'Invite other participants'
        : modal?.kind === 'claim'
          ? CLAIM_DEMO_LABELS[modal.screen]
          : modal?.kind === 'participate-step'
            ? PARTICIPATE_STEPS.find((s) => s.id === modal.step)?.label ?? 'Participate step'
            : 'Dialog'

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Showcase</p>
          <h1 className={styles.title}>Crowdfund stages</h1>
          <p className={styles.lede}>
            Cards and flows across the sale lifecycle — open, closed, finalized, claim — plus
            My Position invites, Participate, and Claim modal states.
          </p>
          <nav className={styles.toc} aria-label="On this page">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={styles.tocLink}>
                {item.label}
              </a>
            ))}
            <a href="/showcase.html" className={styles.tocLinkMuted}>
              Component gallery
            </a>
          </nav>
        </header>

        <Section
          id="crowdfund-cards"
          title="Crowdfund cards"
          description="Progress status pills track the contract phase. Participate card only appears while the window is open."
        >
          <div className={styles.grid}>
            <StateCard label="ACTIVE" note="Below min fund · ≥48h → days left">
              <Progress
                animateOnMount={false}
                committedAmount={857_000}
                status="ACTIVE"
                statusDot="active"
                endsAt={Date.now() + 3 * 24 * 60 * 60 * 1000}
                participants="85 PARTICIPANTS"
              />
            </StateCard>
            <StateCard label="ACTIVE" note="Above min fund · &lt;48h → live counter">
              <Progress
                animateOnMount={false}
                committedAmount={1_450_000}
                status="ACTIVE"
                statusDot="active"
                endsAt={Date.now() + 12 * 60 * 60 * 1000}
                participants="214 PARTICIPANTS"
              />
            </StateCard>
            <StateCard label="CLOSED" note="Window ended · awaiting finalize">
              <Progress
                animateOnMount={false}
                committedAmount={1_700_000}
                status="CLOSED"
                statusDot="neutral"
                daysLeft={null}
                participants="312 PARTICIPANTS"
              />
            </StateCard>
            <StateCard label="FINALIZED" note="Claim window open · purple Claim CTA">
              <Progress
                animateOnMount={false}
                committedAmount={1_700_000}
                status="FINALIZED"
                statusDot="lavender"
                daysLeft={null}
                participants="312 PARTICIPANTS"
                headerAction={
                  <Button
                    variant="primary"
                    size="sm"
                    label="Claim"
                    showIcon={false}
                    onClick={() => setModal({ kind: 'claim', screen: 'review-arm' })}
                  />
                }
              />
            </StateCard>
            <StateCard label="CANCELLED" note="Full USDC refund · purple Claim CTA">
              <Progress
                animateOnMount={false}
                committedAmount={420_000}
                status="CANCELLED"
                statusDot="warning"
                daysLeft={null}
                participants="48 PARTICIPANTS"
                headerAction={
                  <Button
                    variant="primary"
                    size="sm"
                    label="Claim refund"
                    showIcon={false}
                    onClick={() => setModal({ kind: 'claim', screen: 'review-refund' })}
                  />
                }
              />
            </StateCard>
            <StateCard label="Participate" note="Hero CTA · open window only">
              <Participate
                imageSrc="/fleet.png"
                videoSrc="/fleet.mp4"
                onCtaClick={openParticipateFlow}
              />
            </StateCard>
          </div>
        </Section>

        <Section
          id="my-position"
          title="My Position cards"
          description="Open window: Participate / Commit again (gradient). Finalized: Claim (primary purple). Claimed: no CTA."
        >
          <div className={styles.grid}>
            {POSITION_VARIANTS.map(({ variant, label, note }) => (
              <StateCard key={variant} label={label} note={note}>
                <PositionCardDemo
                  variant={variant}
                  onCta={
                    variant === 'open-no-commit' || variant === 'open-committed'
                      ? openParticipateFlow
                      : undefined
                  }
                  onClaim={
                    variant === 'finalized-arm'
                      ? () => setModal({ kind: 'claim', screen: 'review-arm' })
                      : variant === 'finalized-refund'
                        ? () => setModal({ kind: 'claim', screen: 'review-refund' })
                        : undefined
                  }
                />
              </StateCard>
            ))}
          </div>
        </Section>

        <Section
          id="invites"
          title="Invites"
          description="My Position whitelist panel, plus the post-commit modal to whitelist a friend (same screen as Step 5 → Whitelist a friend)."
        >
          <div className={styles.grid}>
            <StateCard
              label="Whitelist a friend card"
              note="My Position panel · mixed slot states"
            >
              <div className={styles.invitesCardWrap}>
                <InvitesCard
                  slots={positionSlots}
                  allowance={DEMO_INVITE_ALLOWANCE}
                  onGenerateLink={(hop) => handleGenerateLinkForHop(setPositionSlots, hop)}
                  onCopy={handleCopy}
                  onRevoke={(slotId) => handleRevoke(setPositionSlots, slotId)}
                  onInviteOnchain={(hop, address, ensName) =>
                    handleInviteOnchainForHop(setPositionSlots, hop, address, ensName)
                  }
                  copiedSlotId={copiedSlotId}
                  loadingHop={loadingHop}
                  onViewRedeemed={(address) => {
                    const url = new URL('/', window.location.origin)
                    url.searchParams.set('view', 'crowdfund')
                    url.searchParams.set('select', address)
                    window.location.assign(url.toString())
                  }}
                />
              </div>
            </StateCard>
            <StateCard
              label="Whitelist a friend modal"
              note="Empty slots · Do it later footer"
            >
              <div className={styles.flowStatic}>
                <ParticipateFlowInviteSlots
                  slots={modalSlots}
                  allowance={modalInviteAllowance}
                  onGenerateLink={(hop) => handleGenerateLinkForHop(setModalSlots, hop)}
                  onCopy={handleCopy}
                  onRevoke={(slotId) => handleRevoke(setModalSlots, slotId)}
                  onInviteOnchain={(hop, address, ensName) =>
                    handleInviteOnchainForHop(setModalSlots, hop, address, ensName)
                  }
                  onDoItLater={() => {}}
                  copiedId={copiedSlotId}
                  loadingHop={loadingHop}
                />
              </div>
            </StateCard>
          </div>
          <div className={styles.actionRow}>
            <Button
              variant="gradient"
              size="md"
              label="Open invite participants modal"
              icon="arrow-right-micro"
              onClick={() => setModal({ kind: 'invite-slots' })}
            />
          </div>
        </Section>

        <Section
          id="participate-flow"
          title="Participate flow"
          description="Open each step in the modal shell, or run the full Path 2 crowdfund flow. Max-out banner sits above the card when self-fill / commit-to-cap still applies."
        >
          <div className={styles.actionRow}>
            <Button
              variant="gradient"
              size="md"
              label="Open full Participate flow"
              icon="arrow-right-micro"
              onClick={openParticipateFlow}
            />
          </div>
          <div className={styles.actionRow}>
            {PARTICIPATE_STEPS.map((step) => (
              <Button
                key={step.id}
                variant="secondary"
                size="sm"
                label={step.label}
                showIcon={false}
                onClick={() => setModal({ kind: 'participate-step', step: step.id })}
              />
            ))}
          </div>
          <div className={styles.scrollViewport} aria-label="Participate steps gallery">
            <div className={styles.scrollRow}>
              {PARTICIPATE_STEPS.map((step) => (
                <StateCard key={`gallery-${step.id}`} label={step.label}>
                  <div className={styles.flowStatic}>
                    <ParticipateStepContent step={step.id} onClose={() => {}} />
                  </div>
                </StateCard>
              ))}
            </div>
          </div>
        </Section>

        <Section
          id="claim-flow"
          title="Claim flow"
          description="Provisional claim screens (no designer mockup yet) — mirrors the committer ClaimFlowV2 states for ARM and refund paths."
        >
          <div className={styles.actionRow}>
            {CLAIM_DEMO_SCREENS.map((screen) => (
              <Button
                key={screen}
                variant="secondary"
                size="sm"
                label={CLAIM_DEMO_LABELS[screen]}
                showIcon={false}
                onClick={() => setModal({ kind: 'claim', screen })}
              />
            ))}
          </div>
          <div className={styles.scrollViewport} aria-label="Claim screens gallery">
            <div className={styles.scrollRow}>
              {CLAIM_DEMO_SCREENS.map((screen) => (
                <StateCard key={screen} label={CLAIM_DEMO_LABELS[screen]}>
                  <ClaimFlowDemo screen={screen} />
                </StateCard>
              ))}
            </div>
          </div>
        </Section>
      </main>

      {modal?.kind === 'participate-flow' ? (
        <ParticipateFlowCrowdfund
          open
          onClose={closeModal}
          onViewPosition={closeModal}
          walletConnected
          hasParticipated={false}
          committedUsdc={0}
          hopVariant="hop-1"
          slots={modalSlots}
          inviteAllowance={modalInviteAllowance}
          onConsumeSelfInvites={(inviteCount) => {
            if (inviteCount <= 0) return
            setModalSlots((prev) => {
              let remaining = inviteCount
              const next = [...prev]
              let id = next.reduce((m, s) => Math.max(m, s.id), 0) + 1
              const now = new Date()
              while (remaining > 0) {
                next.push({
                  id: id++,
                  status: 'redeemed',
                  redeemedBy: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a3c',
                  joinedAt: now,
                  inviteeHop: 1,
                  hideFromList: true,
                })
                remaining -= 1
              }
              return next
            })
            setModalInviteAllowance({ hop1: 0, hop2: 0 })
          }}
          maxOutPlan={{
            eligible: true,
            invites: [{ fromHop: 0, count: 3 }],
            commits: [
              { hop: 0, amount: 15_000, existingCommitted: 0, targetCap: 15_000 },
              { hop: 1, amount: 12_000, existingCommitted: 0, targetCap: 12_000 },
              { hop: 2, amount: 6_000, existingCommitted: 0, targetCap: 6_000 },
            ],
            totalInvites: 9,
            newCommitUsdc: 33_000,
            projectedCeilingUsdc: 33_000,
            currentCeilingUsdc: 15_000,
            totalCommittedAfterUsdc: 33_000,
            projectedReceivedByHop: [1, 3, 6],
          }}
          capUsdc={15_000}
          remainingHopUsdc={15_000}
          onGenerateInviteLink={(hop) => handleGenerateLinkForHop(setModalSlots, hop)}
          onCopySlotLink={handleCopy}
          onRevokeSlot={(slotId) => handleRevoke(setModalSlots, slotId)}
          onInviteOnchainHop={(hop, address, ensName) =>
            handleInviteOnchainForHop(setModalSlots, hop, address, ensName)
          }
          copiedSlotId={copiedSlotId}
          loadingHop={loadingHop}
        />
      ) : (
        <ParticipateFlowModal
          open={modal !== null}
          onClose={closeModal}
          ariaLabel={modalAria}
          showClose={
            modal?.kind === 'participate-step'
              ? modal.step.startsWith('confirmation')
              : true
          }
          footer={
            modal?.kind === 'participate-step' && modal.step === 'invite' ? (
              <Button
                variant="ghost"
                size="md"
                label="Do it later"
                showIcon={false}
                onClick={closeModal}
              />
            ) : null
          }
        >
          {modal?.kind === 'participate-step' ? (
            <ParticipateStepContent step={modal.step} onClose={closeModal} />
          ) : null}
          {modal?.kind === 'claim' ? <ClaimFlowDemo screen={modal.screen} /> : null}
          {modal?.kind === 'invite-slots' ? (
            <ParticipateFlowInviteSlots
              slots={modalSlots}
              allowance={modalInviteAllowance}
              onGenerateLink={(hop) => handleGenerateLinkForHop(setModalSlots, hop)}
              onCopy={handleCopy}
              onRevoke={(slotId) => handleRevoke(setModalSlots, slotId)}
              onInviteOnchain={(hop, address, ensName) =>
                handleInviteOnchainForHop(setModalSlots, hop, address, ensName)
              }
              onDoItLater={closeModal}
              copiedId={copiedSlotId}
              loadingHop={loadingHop}
            />
          ) : null}
        </ParticipateFlowModal>
      )}
    </div>
  )
}
