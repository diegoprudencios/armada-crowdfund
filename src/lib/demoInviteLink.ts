// ABOUTME: Demo invite share URLs — use this app’s /invite landing until a production domain exists.

/**
 * Absolute URL to the crowdfund invite landing with invite + hop query params.
 * Uses the current origin + Vite base until a production crowdfund domain is chosen.
 */
export function createDemoInviteLink(hopSegment: string): string {
  const invite = Math.random().toString(36).slice(2, 10)
  return demoInviteLink(invite, hopSegment)
}

/** Build a deterministic demo invite URL (static showcase / fixture data). */
export function demoInviteLink(invite: string, hopSegment: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${basePath}invite`, origin)
  url.searchParams.set('invite', invite)
  url.searchParams.set('hop', hopSegment)
  return url.href
}
