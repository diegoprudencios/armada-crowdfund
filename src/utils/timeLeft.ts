/** Sale-window countdown helpers for the Progress time-left tag. */

export const TIME_LEFT_COUNTER_THRESHOLD_S = 48 * 60 * 60

/** Live HH:MM:SS counter (hours may exceed 24). */
export function formatTimeLeftCounter(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Crowdfund "time left" label:
 * - ≥ 48h → "N days" / "1 day"
 * - &lt; 48h → live-style HH:MM:SS counter
 * - ≤ 0 → ''
 */
export function formatTimeLeft(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  if (seconds < TIME_LEFT_COUNTER_THRESHOLD_S) return formatTimeLeftCounter(seconds)
  const days = Math.floor(seconds / 86400)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** Progress tag text: counter as-is under 48h; otherwise "N DAYS LEFT". */
export function formatTimeLeftTag(seconds: number): string | null {
  const label = formatTimeLeft(seconds)
  if (!label) return null
  if (seconds < TIME_LEFT_COUNTER_THRESHOLD_S) return label
  return `${label.toUpperCase()} LEFT`
}

export function endsAtToRemainingSeconds(endsAt: number | Date, nowMs = Date.now()): number {
  const endMs = typeof endsAt === 'number' ? endsAt : endsAt.getTime()
  return Math.max(0, Math.floor((endMs - nowMs) / 1000))
}
