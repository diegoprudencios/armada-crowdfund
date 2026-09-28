// ABOUTME: Demo sale / claim gates mirroring POC App.tsx getClaimAvailability + sale status.

/** Contract-like phase: 0 Active, 1 Finalized, 2 Cancelled. */
export type DemoSalePhase = 0 | 1 | 2

export type DemoSaleSnapshot = {
  phase: DemoSalePhase
  /** Commit window still accepting commits. */
  windowOpen: boolean
  /** Sale ended under the minimum fund (refund path once claimable). */
  saleBelowMin: boolean
}

export type ClaimAvailability =
  | { state: 'available' }
  | { state: 'pending'; reason: string }
  | { state: 'pre-open' }

/**
 * Mirror of POC `getClaimAvailability` — gates the Claim nav tab and claim page.
 * Demo has no `armLoaded` delay; treat as loaded.
 */
export function getClaimAvailability(sale: DemoSaleSnapshot): ClaimAvailability {
  if (sale.phase === 1) return { state: 'available' }
  if (sale.phase === 2) return { state: 'available' }

  // phase 0
  if (!sale.windowOpen && sale.saleBelowMin) return { state: 'available' }
  if (!sale.windowOpen) {
    return { state: 'pending', reason: 'Awaiting finalization' }
  }
  return { state: 'pending', reason: 'Opens after the campaign window ends' }
}

export function isClaimReady(sale: DemoSaleSnapshot): boolean {
  return getClaimAvailability(sale).state === 'available'
}

/** Progress status pill — same labels as POC `formatSaleStatusLabel`. */
export function formatSaleStatusLabel(
  phase: DemoSalePhase,
  windowOpen: boolean,
): { label: string; dot: 'active' | 'neutral' | 'lavender' | 'warning' } {
  if (phase === 1) return { label: 'FINALIZED', dot: 'lavender' }
  if (phase === 2) return { label: 'CANCELLED', dot: 'warning' }
  if (!windowOpen) return { label: 'CLOSED', dot: 'neutral' }
  return { label: 'ACTIVE', dot: 'active' }
}

/** Claim flow mode once the user can act (post-finalize / cancel). */
export function claimModeForSale(sale: DemoSaleSnapshot): 'arm' | 'refund' {
  if (sale.phase === 2 || sale.saleBelowMin) return 'refund'
  return 'arm'
}

export type DemoSalePreset =
  | 'active'
  | 'closed'
  | 'below-min'
  | 'finalized'
  | 'finalized-refund'
  | 'cancelled'

export function saleFromPreset(preset: DemoSalePreset): DemoSaleSnapshot {
  switch (preset) {
    case 'closed':
      return { phase: 0, windowOpen: false, saleBelowMin: false }
    case 'below-min':
      return { phase: 0, windowOpen: false, saleBelowMin: true }
    case 'finalized':
      return { phase: 1, windowOpen: false, saleBelowMin: false }
    case 'finalized-refund':
      return { phase: 1, windowOpen: false, saleBelowMin: true }
    case 'cancelled':
      return { phase: 2, windowOpen: false, saleBelowMin: true }
    case 'active':
    default:
      return { phase: 0, windowOpen: true, saleBelowMin: false }
  }
}

export function readSalePresetFromUrl(): DemoSalePreset | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('sale')
  switch (raw) {
    case 'active':
    case 'closed':
    case 'below-min':
    case 'finalized':
    case 'finalized-refund':
    case 'cancelled':
      return raw
    default:
      return null
  }
}
