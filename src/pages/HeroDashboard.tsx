import { Header } from '../components/Header'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'
import { ParticipantsTable } from '../components/ParticipantsTable'
import { Tag } from '../components/Tag'
import { NodeSphere } from './NodeSphere'
import styles from './HeroDashboard.module.css'

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
] as const

export function HeroDashboard() {
  return (
    <div className={styles.page}>
      <Header navItems={[...NAV_ITEMS]} ctaLabel="Participate" className={styles.headerDashboard} />

      <main className={styles.main}>
        <header className={styles.headline}>
          <h1 className={styles.title}>Armada Crowdfund</h1>
          <div className={styles.tags}>
            <Tag label="ACTIVE" dot="active" />
            <Tag label="3 DAYS LEFT" />
            <Tag label="96 PARTICIPANTS" />
          </div>
        </header>

        <section className={styles.topRow} aria-label="Crowdfund summary">
          <Progress hideStatus className={styles.progressMain} />
          <div className={styles.participateWrap}>
            <Participate
              imageSrc="/fleet.png"
              videoSrc="/fleet.mp4"
              onClose={() => {}}
            />
          </div>
        </section>

        <section className={styles.sphereSection} aria-label="Network">
          <div className={styles.sphereFrame}>
            <NodeSphere />
          </div>
        </section>

        <ParticipantsTable />
      </main>
    </div>
  )
}
