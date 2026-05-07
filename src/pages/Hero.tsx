import { Header } from '../components/Header'
import { Progress } from '../components/Progress'
import { Participate } from '../components/Participate'
import { NodeSphere } from './NodeSphere'
import styles from './Hero.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function Hero() {
  return (
    <div className={styles.page}>
      <NodeSphere />

      <Header
        navItems={[...NAV_ITEMS]}
        ctaLabel="Participate"
        className={[styles.headerOverride, styles.enter, styles.enterHeader].join(' ')}
      />

      <div className={styles.bottomBar}>
        <Progress className={[styles.enter, styles.enterProgress].join(' ')} />
        <Participate
          className={[styles.enter, styles.enterParticipate].join(' ')}
          imageSrc="/fleet.png"
          videoSrc="/fleet.mp4"
          onClose={() => {}}
        />
      </div>
    </div>
  )
}

