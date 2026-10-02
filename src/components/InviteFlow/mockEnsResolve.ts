// ABOUTME: Deterministic demo ENS → address resolver so re-invites of the same name match.

/** Well-known demo names (matches DEMO_SLOTS / showcase fixtures). */
const KNOWN_ENS: Record<string, string> = {
  'vitalik.eth': '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
}

/**
 * Demo-only ENS resolution. Same name always maps to the same 0x address so
 * duplicate-invite checks and list rows stay consistent across opens.
 */
export function mockResolveEns(name: string): string {
  const key = name.trim().toLowerCase()
  const known = KNOWN_ENS[key]
  if (known) return known

  // FNV-1a → 40 hex chars (valid-looking address, stable per name).
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let hex = ''
  let cursor = h >>> 0
  while (hex.length < 40) {
    cursor = Math.imul(cursor ^ 0x9e3779b9, 16777619) >>> 0
    hex += cursor.toString(16).padStart(8, '0')
  }
  return `0x${hex.slice(0, 40)}`
}
