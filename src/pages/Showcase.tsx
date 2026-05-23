import { useState } from 'react'
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
import ParticipateFlow from '../components/ParticipateFlow/ParticipateFlow'

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
  const [participateOpen, setParticipateOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#0e0d0f', paddingTop: 56 }}>
      <ParticipateFlow
        isOpen={participateOpen}
        onClose={() => setParticipateOpen(false)}
      />
      <Header navItems={NAV_ITEMS} />

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
        <Participate imageSrc="/fleet.png" onClose={() => {}} />
      </section>

      {/* Steps */}
      <section style={sectionStyle}>
        <div style={eyebrow}>Steps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 480 }}>
          <Steps steps={['Connect', 'Commit', 'Review', 'Confirmation']} currentStep={2} />
          <Steps
            steps={['Connect', 'Commit', 'Review', 'Confirmation']}
            currentStep={3}
            status="error"
          />
        </div>
      </section>

      {/* WalletItem */}
      <section style={sectionStyle}>
        <div style={eyebrow}>WalletItem</div>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 360 }}>
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
          Inline preview below. Open full-screen for the real modal experience.
        </p>
        <ParticipateFlow variant="embedded" />
        <div style={{ marginTop: 20 }}>
          <Button
            variant="primary"
            size="md"
            label="Open full-screen modal"
            showIcon={false}
            onClick={() => setParticipateOpen(true)}
          />
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

