import styles from './BarTrackTicks.module.css'

/**
 * Full-width tick grid via CSS repeat — positions are fixed to the track, not
 * the animated fill. The fill layer stacks above and covers ticks where filled.
 */
export function BarTrackTicks() {
  return <div className={styles.host} aria-hidden />
}
