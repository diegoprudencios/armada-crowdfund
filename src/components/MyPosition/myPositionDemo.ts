import type { SlotData } from '../InviteFlow/screens/SlotCard'
import type { PinnedNode } from '../../pages/NodeSphere'

export const COMMITTED = 4000
export const CAP = 10000
/** ARM allocation is 1:1 with USDC committed. */
export const ARM_ALLOCATION = COMMITTED
export const FILL_PCT = (COMMITTED / CAP) * 100

export function formatUsdcCommitted(value: number = COMMITTED): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatArmAllocation(value: number = ARM_ALLOCATION): string {
  return value.toLocaleString('en-US')
}
export const GRAPH_SEED = 42
export const GRAPH_PARTICIPANTS = 5 as const
export const DEMO_WALLET = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a3c'
export const DEMO_WALLET_DISPLAY = '0x1a2b...9a3c'

/** Empty invite slots still available — for “X of Y” header count on My Position. */
export function countAvailableInviteSlots(slots: SlotData[]): number {
  return slots.filter((slot) => slot.status === 'empty').length
}

export const DEMO_SLOTS: SlotData[] = [
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

export function buildInvitePinnedNodes(
  slots: SlotData[],
  walletAddress: string,
  committedUsdc: number,
): PinnedNode[] {
  const nodes: PinnedNode[] = [
    {
      kind: 'Your wallet',
      address: walletAddress,
      committed:
        committedUsdc > 0
          ? `$${committedUsdc.toLocaleString()} committed`
          : '$0 committed',
    },
  ]

  for (const slot of slots) {
    if (slot.status === 'redeemed' && slot.redeemedBy) {
      nodes.push({
        kind: 'Hop 1',
        address: slot.redeemedBy,
        committed: 'Joined',
      })
    } else if (slot.status === 'onchain-pending' && slot.invitedAddress) {
      nodes.push({
        kind: 'Hop 1',
        address: slot.invitedAddress,
        committed: 'Pending invite',
      })
    }
  }

  return nodes
}
