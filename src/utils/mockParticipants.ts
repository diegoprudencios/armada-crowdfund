export type ScenarioParticipants = 0 | 3 | 4 | 5 | 30 | 800

type HopKind = 'Hop 0' | 'Hop 1' | 'Hop 2' | 'Multi-hop'
type HeroHop = 'SEED' | 'HOP-1' | 'HOP-2' | 'MULTI-HOP'

export type HeroParticipantRow = {
  address: string
  hop: HeroHop
  amountUsd: number
}

export type DashboardParticipant = {
  address: string
  hop: HopKind
  amountUsd: number
}

export type ParticipantsTableRow = {
  address: string
  hops: string
  committedUsd: number
  invitedBy: string
  invitesUsed: number
  invitesTotal: number
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeAddress(rand: () => number) {
  const hex = '0123456789abcdef'
  const pick = () => hex[Math.floor(rand() * hex.length)]
  let out = '0x'
  for (let i = 0; i < 40; i += 1) out += pick()
  return `${out.slice(0, 6)}...${out.slice(-4)}`
}

function pickHop(rand: () => number): HopKind {
  const r = rand()
  if (r < 0.55) return 'Hop 0'
  if (r < 0.8) return 'Hop 1'
  if (r < 0.95) return 'Hop 2'
  return 'Multi-hop'
}

function amountForScenario(count: ScenarioParticipants, rand: () => number) {
  // Roughly scale ticket size by scenario size.
  if (count === 0) return 0
  if (count <= 5) return 1_000 + Math.floor(rand() * 19_000)
  if (count === 30) return 2_000 + Math.floor(rand() * 28_000)
  return 5_000 + Math.floor(rand() * 75_000)
}

export function generateDashboardParticipants(seed: number, count: ScenarioParticipants): DashboardParticipant[] {
  const rand = mulberry32(seed)
  const out: DashboardParticipant[] = []
  for (let i = 0; i < count; i += 1) {
    out.push({
      address: makeAddress(rand),
      hop: pickHop(rand),
      amountUsd: amountForScenario(count, rand),
    })
  }
  return out
}

export function toHeroParticipants(rows: DashboardParticipant[]): HeroParticipantRow[] {
  return rows.map((r) => ({
    address: r.address,
    hop:
      r.hop === 'Hop 0'
        ? 'SEED'
        : r.hop === 'Hop 1'
          ? 'HOP-1'
          : r.hop === 'Hop 2'
            ? 'HOP-2'
            : 'MULTI-HOP',
    amountUsd: r.amountUsd,
  }))
}

export function generateParticipantsTableRows(seed: number, count: ScenarioParticipants): ParticipantsTableRow[] {
  const rand = mulberry32(seed ^ 0x9e3779b9)
  const out: ParticipantsTableRow[] = []
  const base = generateDashboardParticipants(seed, count)
  for (let i = 0; i < base.length; i += 1) {
    const invitesTotal = count >= 800 ? 5 : 3
    const invitesUsed = Math.min(invitesTotal, Math.floor(rand() * (invitesTotal + 1)))
    out.push({
      address: base[i].address,
      hops: base[i].hop,
      committedUsd: base[i].amountUsd,
      invitedBy: i % 7 === 0 ? 'Armada' : out[Math.max(0, i - 1)]?.address ?? 'Armada',
      invitesUsed,
      invitesTotal,
    })
  }
  return out
}

