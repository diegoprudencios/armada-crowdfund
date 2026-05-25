import { Button } from '../components/Button'
import { Tag } from '../components/Tag'
import { NavBar } from '../components/NavBar'
import { Header } from '../components/Header'
import HopPill from '../components/HopPill/HopPill'
import JoinButton from '../components/JoinButton/JoinButton'
import Steps from '../components/Steps/Steps'
import {
  WalletMetamask as MetaMask,
  WalletCoinbase as Coinbase,
  WalletWalletConnect as WalletConnect,
} from '@web3icons/react'
import WalletItem from '../components/WalletItem/WalletItem'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'
import Step0Invite from '../components/ParticipateFlow/steps/Step0Invite/Step0Invite'
import Step1Wallet from '../components/ParticipateFlow/screens/Step1Wallet'
import Step2Commit from '../components/ParticipateFlow/screens/Step2Commit.tsx'
import Step3Review from '../components/ParticipateFlow/screens/Step3Review.tsx'
import Step4Approve from '../components/ParticipateFlow/screens/Step4Approve'
import Step5Confirmation from '../components/ParticipateFlow/screens/Step5Confirmation'
import Tooltip from '../components/Tooltip/Tooltip'

const variants = ['primary', 'secondary', 'ghost', 'gradient'] as const
const sizes = ['sm', 'md', 'lg'] as const

const sectionStyle = {
  padding: '48px 40px',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
}

const eyebrow = {
  fontFamily: '"Geist", sans-serif',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: 'rgba(255,255,255,0.3)',
  marginBottom: 20,
}

const NAV_ITEMS = [
  { label: 'The project' },
  { label: 'Crowdfund', active: true },
  { label: 'My position' },
  { label: 'Claim' },
]

export function Showcase() {
  return (
    <div style={{ minHeight: '100vh', background: '#0e0d0f', paddingTop: 56 }}>
      <Header activeNav="crowdfund" autoHideOnScroll={false} />

      {/* Button */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Button</div>
        {sizes.map(size => (
          <div key={size} style={{ marginBottom: 32 }}>
            <div style={{ ...eyebrow, marginBottom: 12, color: 'rgba(255,255,255,0.2)' }}>
              {size.toUpperCase()} — {size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              {variants.map(v => <Button key={`${size}-${v}`} variant={v} size={size} label={v} showIcon={false} />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              {variants.map(v => <Button key={`${size}-${v}-i`} variant={v} size={size} label={v} showIcon />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {variants.map(v => <Button key={`${size}-${v}-d`} variant={v} size={size} label={v} showIcon disabled />)}
            </div>
          </div>
        ))}
      </section>

      {/* Tag */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Tag</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Tag label="Tag label" />
          <Tag label="Active" dot="active" />
          <Tag label="Warning" dot="warning" />
          <Tag label="Error" dot="error" />
          <Tag label="Neutral" dot="neutral" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag label="Active" dot="active" />
          <Tag label="3 days left" />
          <Tag label="96 participants" />
        </div>
      </section>

      {/* Tooltip */}
      <section style={{ ...sectionStyle, overflow: 'visible' }}>
        <div style={eyebrow}>TOOLTIP</div>
        <div
          style={{
            display: 'flex',
            gap: 48,
            alignItems: 'center',
            flexWrap: 'wrap',
            overflow: 'visible',
            minHeight: 280,
            paddingTop: 160,
          }}
        >
          <Tooltip variant="centered" content="This is a simple centered tooltip.">
            <Button variant="secondary" size="sm" label="Hover me" showIcon={false} />
          </Tooltip>

          <Tooltip
            variant="rich"
            title="EST. ARM Allocation"
            description="Your estimated allocation based on the amount committed."
            bullets={[
              "Proportional to your USDC committed",
              "Final allocation confirmed at close",
              "Subject to pool cap",
            ]}
          >
            <Button variant="secondary" size="sm" label="Hover me" showIcon={false} />
          </Tooltip>
        </div>
      </section>

      {/* NavBar */}
      <section style={sectionStyle}>
        <div style={eyebrow}>NavBar</div>
        <NavBar items={NAV_ITEMS} />
      </section>

      {/* Progress */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Progress</div>
        <Progress />
      </section>

      {/* Participate */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Participate</div>
        <Participate imageSrc="/fleet.png" videoSrc="/fleet.mp4" />
      </section>

      {/* Steps */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Steps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 480 }}>
          <Steps steps={['Connect', 'Commit', 'Review', 'Confirmation']} currentStep={2} />
          <Steps
            steps={['Connect', 'Commit', 'Review', 'Confirmation']}
            currentStep={1}
            status="error"
          />
          <Steps
            steps={['Connect', 'Commit', 'Review', 'Confirmation']}
            currentStep={4}
            status="error"
          />
          <Steps
            steps={['Connect', 'Commit', 'Review', 'Confirmation']}
            currentStep={4}
            status="confirmed"
          />
        </div>
      </section>

      {/* WalletItem */}
      <section style={sectionStyle}>
        <div style={eyebrow}>WalletItem</div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--primitives-spacing-3)',
            maxWidth: 360,
          }}
        >
          <WalletItem
            name="MetaMask"
            balance="1,240 USDC"
            onClick={() => {}}
            iconComponent={<MetaMask size={24} />}
          />
          <WalletItem
            name="Coinbase Wallet"
            onClick={() => {}}
            iconComponent={<Coinbase size={24} />}
          />
          <WalletItem
            name="WalletConnect"
            disabled
            onClick={() => {}}
            iconComponent={<WalletConnect size={24} />}
          />
        </div>
      </section>

      {/* HopPill */}
      <section style={sectionStyle}>
        <div style={eyebrow}>HopPill</div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            padding: 24,
            borderRadius: 12,
            background: '#0e0d0f',
          }}
        >
          <HopPill variant="seed" />
          <HopPill variant="hop-1" />
          <HopPill variant="hop-2" />
          <HopPill variant="multi-hop" />
        </div>
      </section>

      {/* ParticipateFlow */}
      <section style={sectionStyle}>
        <div style={eyebrow}>ParticipateFlow</div>
        <p style={{ ...eyebrow, textTransform: 'none', letterSpacing: 'normal', marginBottom: 20 }}>
          Each step is isolated for now — side by side until the full flow is wired up.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 24,
            alignItems: 'flex-start',
            overflowX: 'auto',
            width: '100%',
            paddingBottom: 16,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Step 0 (Invite)</div>
            <Step0Invite
              hopVariant="hop-1"
              daysLeft={3}
              onJoin={() => console.log('join clicked')}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Step 1 (Wallet)</div>
            <Step1Wallet onNext={(wallet) => console.log('wallet:', wallet)} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>STEP 2 (COMMIT)</div>
            <Step2Commit
              onNext={(amount: number) => console.log('amount:', amount)}
              onBack={() => console.log('back')}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>STEP 3 (REVIEW)</div>
            <Step3Review
              onNext={() => console.log('approve')}
              onBack={() => console.log('back')}
              hopLevel="Hop 1"
              amount={1000}
              estimatedArm={1000}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>STEP 4 (APPROVE)</div>
            <Step4Approve
              onDone={() => console.log('approve done')}
              amount={1000}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>STEP 5 (CONFIRMATION)</div>
            <Step5Confirmation
              onViewPosition={() => console.log('view position')}
              onInvite={() => console.log('invite')}
              amount={1000}
              estimatedArm={1000}
            />
          </div>
        </div>
      </section>

      {/* JoinButton */}
      <section style={sectionStyle}>
        <div style={eyebrow}>JoinButton</div>
        <p style={{ ...eyebrow, textTransform: 'none', letterSpacing: 'normal', marginBottom: 16 }}>
          Hover to expand — collapsed shows icon only
        </p>
        <JoinButton onClick={() => {}} />
      </section>
    </div>
  )
}

