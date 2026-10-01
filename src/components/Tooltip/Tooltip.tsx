// ABOUTME: Hover/focus tooltip — simple centered copy or rich title/description/bullets.
// ABOUTME: Portals to document.body with fixed coords so scrollable modal overflow cannot clip it.

import { useState, useRef, useId, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './Tooltip.module.css'

interface TooltipSimpleProps {
  variant: 'centered'
  content: string
  children: React.ReactNode
}

interface TooltipRichProps {
  variant: 'rich'
  title: string
  description?: string
  bullets?: string[]
  children: React.ReactNode
}

type TooltipProps = TooltipSimpleProps | TooltipRichProps

export default function Tooltip(props: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const tooltipId = useId()
  const triggerRef = useRef<HTMLDivElement>(null)

  const show = () => setVisible(true)
  const hide = () => setVisible(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setVisible(false)
      triggerRef.current?.focus()
    }
  }

  useLayoutEffect(() => {
    if (!visible) {
      setCoords(null)
      return
    }
    const el = triggerRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      })
    }

    update()
    // Capture scroll on any ancestor (modal body, cardContent, window).
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [visible])

  const tooltip =
    visible && coords ? (
      <div
        id={tooltipId}
        className={[
          styles.tooltip,
          props.variant === 'centered' ? styles.centered : styles.rich,
        ].join(' ')}
        style={{ top: coords.top, left: coords.left }}
        role="tooltip"
      >
        {props.variant === 'centered' && (
          <p className={styles.centeredText}>{props.content}</p>
        )}

        {props.variant === 'rich' && (
          <>
            <p className={styles.title}>{props.title}</p>
            {props.description && (
              <p className={styles.description}>{props.description}</p>
            )}
            {props.bullets && props.bullets.length > 0 && (
              <ul className={styles.bulletList}>
                {props.bullets.map((b, i) => (
                  <li key={i} className={styles.bulletItem}>
                    <span className={styles.bulletDot} aria-hidden="true" />
                    <span className={styles.bulletText}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    ) : null

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
      ref={triggerRef}
      tabIndex={0}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {props.children}
      {tooltip && createPortal(tooltip, document.body)}
    </div>
  )
}
