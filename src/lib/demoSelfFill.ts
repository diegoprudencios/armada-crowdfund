// ABOUTME: Demo hop caps + self-fill plan mirroring POC mainnet HOP_CONFIGS / computeSelfFillPlan (USD numbers).

/** Mainnet per-hop config from CROWDFUND.md / armada-poc HOP_CONFIGS. */
export const DEMO_HOP_CONFIGS = [
  { capUsdc: 15_000, maxInvites: 3, maxInvitesReceived: 1 },
  { capUsdc: 4_000, maxInvites: 2, maxInvitesReceived: 10 },
  { capUsdc: 1_000, maxInvites: 0, maxInvitesReceived: 20 },
] as const

export type DemoHopIndex = 0 | 1 | 2

export type DemoHopState = {
  /** Participation slots at this hop (invites received). */
  invitesReceived: number
  /** Outgoing invites still available from this hop. */
  invitesRemaining: number
  /** USDC already committed at this hop. */
  committed: number
}

export type DemoSelfFillState = readonly [DemoHopState, DemoHopState, DemoHopState]

export type DemoSelfFillInvite = { fromHop: 0 | 1; count: number }

export type DemoSelfFillCommit = {
  hop: DemoHopIndex
  amount: number
  existingCommitted: number
  targetCap: number
}

export type DemoSelfFillPlan = {
  eligible: boolean
  invites: DemoSelfFillInvite[]
  commits: DemoSelfFillCommit[]
  totalInvites: number
  newCommitUsdc: number
  /** Ceiling reachable after self-invites (sum of projected hop caps). */
  projectedCeilingUsdc: number
  /** Ceiling on hops already held — no new self-invites (input MAX). */
  currentCeilingUsdc: number
  totalCommittedAfterUsdc: number
  projectedReceivedByHop: [number, number, number]
}

const MIN_COMMIT_USDC = 1

export function emptyHopState(): DemoHopState {
  return { invitesReceived: 0, invitesRemaining: 0, committed: 0 }
}

/** Hop-0 starter: 1 slot, 3 outgoing invites to hop-1. */
export function initialHop0State(): DemoSelfFillState {
  return [
    {
      invitesReceived: 1,
      invitesRemaining: DEMO_HOP_CONFIGS[0].maxInvites,
      committed: 0,
    },
    emptyHopState(),
    emptyHopState(),
  ]
}

/** Hop-1 invitee: 1 hop-1 slot, 2 outgoing to hop-2. */
export function initialHop1State(): DemoSelfFillState {
  return [
    emptyHopState(),
    {
      invitesReceived: 1,
      invitesRemaining: DEMO_HOP_CONFIGS[1].maxInvites,
      committed: 0,
    },
    emptyHopState(),
  ]
}

/** Hop-2 invitee: 1 hop-2 slot, no outgoing invites. */
export function initialHop2State(): DemoSelfFillState {
  return [
    emptyHopState(),
    emptyHopState(),
    { invitesReceived: 1, invitesRemaining: 0, committed: 0 },
  ]
}

export function totalCommitted(state: DemoSelfFillState): number {
  return state[0].committed + state[1].committed + state[2].committed
}

export function currentCeilingUsdc(state: DemoSelfFillState): number {
  return (
    state[0].invitesReceived * DEMO_HOP_CONFIGS[0].capUsdc +
    state[1].invitesReceived * DEMO_HOP_CONFIGS[1].capUsdc +
    state[2].invitesReceived * DEMO_HOP_CONFIGS[2].capUsdc
  )
}

export function remainingOnCurrentHops(state: DemoSelfFillState): number {
  return Math.max(0, currentCeilingUsdc(state) - totalCommitted(state))
}

/**
 * Mirror of POC `computeSelfFillPlan` — spend all remaining outgoing invites on
 * self (bounded by maxInvitesReceived), then top up every hop to its projected cap.
 */
export function computeDemoSelfFillPlan(state: DemoSelfFillState): DemoSelfFillPlan {
  const received = [
    state[0].invitesReceived,
    state[1].invitesReceived,
    state[2].invitesReceived,
  ]
  const eligible = received.some((r) => r > 0)
  const currentCeiling = currentCeilingUsdc(state)

  const invites: DemoSelfFillInvite[] = []

  const room1 = DEMO_HOP_CONFIGS[1].maxInvitesReceived - received[1]
  const add1 = Math.max(0, Math.min(state[0].invitesRemaining, room1))
  if (add1 > 0) invites.push({ fromHop: 0, count: add1 })
  const projReceived1 = received[1] + add1

  const rem1 = state[1].invitesRemaining + add1 * DEMO_HOP_CONFIGS[1].maxInvites
  const room2 = DEMO_HOP_CONFIGS[2].maxInvitesReceived - received[2]
  const add2 = Math.max(0, Math.min(rem1, room2))
  if (add2 > 0) invites.push({ fromHop: 1, count: add2 })
  const projReceived2 = received[2] + add2

  const projectedReceivedByHop: [number, number, number] = [
    received[0],
    projReceived1,
    projReceived2,
  ]
  const projectedCapByHop: [number, number, number] = [
    projectedReceivedByHop[0] * DEMO_HOP_CONFIGS[0].capUsdc,
    projectedReceivedByHop[1] * DEMO_HOP_CONFIGS[1].capUsdc,
    projectedReceivedByHop[2] * DEMO_HOP_CONFIGS[2].capUsdc,
  ]

  const commits: DemoSelfFillCommit[] = []
  let newCommitUsdc = 0
  let totalExisting = 0
  for (let hop = 0 as DemoHopIndex; hop < 3; hop = (hop + 1) as DemoHopIndex) {
    const existing = state[hop].committed
    totalExisting += existing
    const targetCap = projectedCapByHop[hop]
    const delta = targetCap > existing ? targetCap - existing : 0
    if (delta >= MIN_COMMIT_USDC) {
      commits.push({ hop, amount: delta, existingCommitted: existing, targetCap })
      newCommitUsdc += delta
    }
  }

  const projectedCeilingUsdc =
    projectedCapByHop[0] + projectedCapByHop[1] + projectedCapByHop[2]

  return {
    eligible,
    invites,
    commits,
    totalInvites: invites.reduce((sum, i) => sum + i.count, 0),
    newCommitUsdc,
    projectedCeilingUsdc,
    currentCeilingUsdc: currentCeiling,
    totalCommittedAfterUsdc: totalExisting + newCommitUsdc,
    projectedReceivedByHop,
  }
}

/** Apply a self-fill plan onto hop state (invites received + commits). Outgoing invites are spent. */
export function applyDemoSelfFillPlan(
  state: DemoSelfFillState,
  plan: DemoSelfFillPlan,
): DemoSelfFillState {
  const committed: [number, number, number] = [
    state[0].committed,
    state[1].committed,
    state[2].committed,
  ]
  for (const c of plan.commits) {
    committed[c.hop] = c.existingCommitted + c.amount
  }
  return [
    {
      invitesReceived: plan.projectedReceivedByHop[0],
      invitesRemaining: 0,
      committed: committed[0],
    },
    {
      invitesReceived: plan.projectedReceivedByHop[1],
      invitesRemaining: 0,
      committed: committed[1],
    },
    {
      invitesReceived: plan.projectedReceivedByHop[2],
      invitesRemaining: 0,
      committed: committed[2],
    },
  ]
}

/** Add a normal (non-max-out) commit onto the primary held hop. */
export function applyDemoHopCommit(
  state: DemoSelfFillState,
  amountUsdc: number,
): DemoSelfFillState {
  if (amountUsdc <= 0) return state
  const next: [DemoHopState, DemoHopState, DemoHopState] = [
    { ...state[0] },
    { ...state[1] },
    { ...state[2] },
  ]
  // Prefer lowest hop with remaining room (seed → hop-1 → hop-2).
  for (let hop = 0 as DemoHopIndex; hop < 3; hop = (hop + 1) as DemoHopIndex) {
    if (next[hop].invitesReceived <= 0) continue
    const cap = next[hop].invitesReceived * DEMO_HOP_CONFIGS[hop].capUsdc
    const room = Math.max(0, cap - next[hop].committed)
    if (room <= 0) continue
    const add = Math.min(room, amountUsdc)
    next[hop].committed += add
    amountUsdc -= add
    if (amountUsdc <= 0) break
  }
  return next
}

export function hopVariantFromState(state: DemoSelfFillState): 'seed' | 'hop-1' | 'hop-2' | 'multi-hop' {
  const held = ([0, 1, 2] as const).filter((h) => state[h].invitesReceived > 0)
  if (held.length > 1) return 'multi-hop'
  if (held[0] === 0) return 'seed'
  if (held[0] === 2) return 'hop-2'
  return 'hop-1'
}

export function inviteAllowanceFromState(state: DemoSelfFillState): {
  hop1: number
  hop2: number
} {
  return {
    hop1: state[0].invitesRemaining,
    hop2: state[1].invitesRemaining,
  }
}

/**
 * Spend one outgoing invite from `fromHop`. When the invitee is the connected
 * wallet (POC `invite(self, hop)`), immediately credit a participation slot at
 * the invitee hop and grant that hop's outgoing invite budget.
 */
export function applyDemoOutgoingInvite(
  state: DemoSelfFillState,
  inviteeHop: 1 | 2,
  opts: { selfInvite: boolean },
): DemoSelfFillState {
  const fromHop = (inviteeHop - 1) as 0 | 1
  const next: [DemoHopState, DemoHopState, DemoHopState] = [
    { ...state[0] },
    { ...state[1] },
    { ...state[2] },
  ]
  next[fromHop] = {
    ...next[fromHop],
    invitesRemaining: Math.max(0, next[fromHop].invitesRemaining - 1),
  }
  if (!opts.selfInvite) return next

  const target = inviteeHop as DemoHopIndex
  const cfg = DEMO_HOP_CONFIGS[target]
  if (next[target].invitesReceived >= cfg.maxInvitesReceived) return next

  next[target] = {
    ...next[target],
    invitesReceived: next[target].invitesReceived + 1,
    invitesRemaining: next[target].invitesRemaining + cfg.maxInvites,
  }
  return next
}

export function addressesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}
