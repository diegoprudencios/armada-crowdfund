import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import styles from './ParticipateFlowModal.module.css'

const EXIT_MS = 280
const CLOSE_ICON_PX = 14
const ARMADA_SYMBOL_SRC = `${import.meta.env.BASE_URL}armada-symbol-color.png`
const MODAL_OPEN_ATTR = 'data-flow-modal-open'

export interface ParticipateFlowModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible name for the dialog (e.g. step headline). */
  ariaLabel: string
  /** Accessible name for the close control. */
  closeAriaLabel?: string
  /** When false, hides the top-right close control (e.g. invite uses “Do it later”). */
  showClose?: boolean
  /** Optional content below the step shell (e.g. “Do it later” text link). */
  footer?: ReactNode
}

export function ParticipateFlowModal({
  open,
  onClose,
  children,
  ariaLabel,
  closeAriaLabel = 'Close participate flow',
  showClose = true,
  footer,
}: ParticipateFlowModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(open)
  const [exiting, setExiting] = useState(false)
  // Hold latest onClose without re-running the lock/focus effect on every parent render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (open) {
      setMounted(true)
      setExiting(false)
      return
    }
    if (!mounted) return
    setExiting(true)
    const timer = window.setTimeout(() => {
      setMounted(false)
      setExiting(false)
    }, EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [open, mounted])

  useEffect(() => {
    if (!mounted || exiting) return

    // Lock page scroll while the modal is open. `overflow: hidden` alone is not
    // enough on iOS / when the crowdfund page scrolls — pin the body and restore
    // scroll position on close.
    const html = document.documentElement
    const body = document.body
    const root = document.getElementById('root')
    const scrollY = window.scrollY
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      rootInert: root?.inert ?? false,
    }

    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    html.setAttribute(MODAL_OPEN_ATTR, '')
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    if (root) root.inert = true

    // Move focus into the dialog. Steps that draw their own chrome leave
    // `showClose` false — fall through to the first control in the step.
    if (showClose) {
      closeRef.current?.focus()
    } else {
      const FOCUSABLE =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      const focusable =
        footerRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
        stepRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      focusable?.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      html.style.overflow = prev.htmlOverflow
      html.style.overscrollBehavior = prev.htmlOverscroll
      html.removeAttribute(MODAL_OPEN_ATTR)
      body.style.overflow = prev.bodyOverflow
      body.style.overscrollBehavior = prev.bodyOverscroll
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      if (root) root.inert = prev.rootInert
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mounted, exiting, showClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={[styles.backdrop, exiting && styles.backdropExit].join(' ')}
      role="presentation"
    >
      <img
        src={ARMADA_SYMBOL_SRC}
        alt=""
        width={40}
        height={40}
        className={styles.mobileLogo}
        aria-hidden
      />
      <div
        className={[
          styles.panel,
          !showClose && styles.panelNoClose,
          exiting && styles.panelExit,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {showClose ? (
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={() => onCloseRef.current()}
            aria-label={closeAriaLabel}
          >
            <XMarkIcon width={CLOSE_ICON_PX} height={CLOSE_ICON_PX} aria-hidden />
          </button>
        ) : null}
        <div
          ref={stepRef}
          className={[styles.step, exiting && styles.stepExit].filter(Boolean).join(' ')}
        >
          {children}
        </div>
        {footer ? (
          <div ref={footerRef} className={styles.footer}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
