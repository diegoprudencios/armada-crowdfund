import { Button } from '../components/Button'
import { Tag } from '../components/Tag'
import { NavBar } from '../components/NavBar'
import { Header } from '../components/Header'
import { Participate } from '../components/Participate'
import { Progress } from '../components/Progress'

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
    </div>
  )
}

