import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ArmadaLogo } from '../components/ArmadaLogo'
import styles from './Brand.module.css'

const BASE = import.meta.env.BASE_URL

type BrandColor = {
  name: string
  hex: string
  token: string
  role: string
  swatchVar: string
}

const BRAND_COLORS: BrandColor[] = [
  {
    name: 'Lavender',
    hex: '#C491E5',
    token: '--semantic-color-brand-lavender',
    role: 'Accent, borders, gradient start',
    swatchVar: 'var(--semantic-color-brand-lavender)',
  },
  {
    name: 'Rose',
    hex: '#F39DB0',
    token: '--semantic-color-brand-gradient-rose',
    role: 'Gem gradient mid',
    swatchVar: 'var(--semantic-color-brand-gradient-rose)',
  },
  {
    name: 'Amber',
    hex: '#F3D0A0',
    token: '--semantic-color-brand-amber',
    role: 'Accent, gradient end',
    swatchVar: 'var(--semantic-color-brand-amber)',
  },
  {
    name: 'Action',
    hex: '#5227CA',
    token: '--semantic-color-brand-action',
    role: 'Primary CTA fill',
    swatchVar: 'var(--semantic-color-brand-action)',
  },
  {
    name: 'Deep',
    hex: '#291433',
    token: '--semantic-color-brand-deep',
    role: 'Accent deep / purple-900',
    swatchVar: 'var(--semantic-color-brand-deep)',
  },
  {
    name: 'Background',
    hex: '#0E0D0F',
    token: '--semantic-color-surface-bg',
    role: 'Page background',
    swatchVar: 'var(--semantic-color-surface-bg)',
  },
  {
    name: 'Text',
    hex: '#FFFFFF',
    token: '--semantic-color-text-primary',
    role: 'Primary text on dark',
    swatchVar: 'var(--semantic-color-text-primary)',
  },
]

type LogoAsset = {
  id: string
  title: string
  description: string
  preview: 'full-dark' | 'full-light' | 'symbol' | 'wordmark-white' | 'wordmark-dark'
  downloads: { label: string; href: string }[]
  copySvgHref?: string
}

const LOGO_ASSETS: LogoAsset[] = [
  {
    id: 'full',
    title: 'Full logo',
    description: 'Symbol and wordmark together. Use when brand context is needed.',
    preview: 'full-dark',
    downloads: [
      { label: 'SVG (dark)', href: `${BASE}brand/armada-logo-full-dark.svg` },
      { label: 'SVG (light)', href: `${BASE}brand/armada-logo-full-light.svg` },
      { label: 'PNG (light)', href: `${BASE}brand/armada-logo-full-light.png` },
    ],
    copySvgHref: `${BASE}brand/armada-logo-full-dark.svg`,
  },
  {
    id: 'symbol',
    title: 'Symbol',
    description: 'The diamond mark alone. Use at small sizes or when space is tight.',
    preview: 'symbol',
    downloads: [
      { label: 'SVG', href: `${BASE}brand/armada-symbol.svg` },
      { label: 'PNG', href: `${BASE}brand/armada-symbol.png` },
    ],
    copySvgHref: `${BASE}brand/armada-symbol.svg`,
  },
  {
    id: 'wordmark',
    title: 'Wordmark',
    description: 'Armada type alone. Pair with the symbol — do not redraw the letters.',
    preview: 'wordmark-white',
    downloads: [
      { label: 'SVG (white)', href: `${BASE}brand/armada-wordmark-white.svg` },
      { label: 'SVG (dark)', href: `${BASE}brand/armada-wordmark-dark.svg` },
    ],
    copySvgHref: `${BASE}brand/armada-wordmark-white.svg`,
  },
]

function LogoPreview({ kind }: { kind: LogoAsset['preview'] }) {
  const src =
    kind === 'full-dark'
      ? `${BASE}brand/armada-logo-full-dark.svg`
      : kind === 'full-light'
        ? `${BASE}brand/armada-logo-full-light.svg`
        : kind === 'symbol'
          ? `${BASE}brand/armada-symbol.svg`
          : kind === 'wordmark-dark'
            ? `${BASE}brand/armada-wordmark-dark.svg`
            : `${BASE}brand/armada-wordmark-white.svg`

  const size =
    kind === 'symbol'
      ? { className: styles.previewSymbol, width: 64, height: 64 }
      : kind === 'wordmark-white' || kind === 'wordmark-dark'
        ? { className: styles.previewWordmark, width: 138, height: 48 }
        : { className: styles.previewFull, width: 198, height: 48 }

  return <img className={size.className} src={src} alt="" width={size.width} height={size.height} />
}

export function Brand() {
  const liveId = useId()
  const [status, setStatus] = useState('')
  const clearTimer = useRef<number | null>(null)

  const announce = useCallback((message: string) => {
    setStatus(message)
    if (clearTimer.current != null) window.clearTimeout(clearTimer.current)
    clearTimer.current = window.setTimeout(() => setStatus(''), 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current)
    }
  }, [])

  const copyHex = async (hex: string, name: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      announce(`Copied ${name} ${hex}`)
    } catch {
      announce('Could not copy color')
    }
  }

  const copySvg = async (href: string, title: string) => {
    try {
      const res = await fetch(href)
      if (!res.ok) throw new Error('fetch failed')
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      announce(`Copied ${title} SVG`)
    } catch {
      announce('Could not copy SVG')
    }
  }

  return (
    <div className={styles.page}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <header className={styles.topBar}>
        <a href="/" className={styles.homeLink} aria-label="Armada home">
          <ArmadaLogo variant="full" className={styles.topLogo} />
        </a>
        <p className={styles.topEyebrow}>Brand</p>
      </header>

      <main id="main" className={styles.main}>
        <header className={styles.hero}>
          <h1 className={styles.title}>Armada Brand</h1>
          <p className={styles.lede}>
            Logos, colors, and fleet imagery for partners and press. Use the assets as provided —
            do not stretch, recolor, or redraw the mark.
          </p>
        </header>

        <div id={liveId} className={styles.live} role="status" aria-live="polite" aria-atomic="true">
          {status}
        </div>

        <section className={styles.section} aria-labelledby="logos-heading">
          <div className={styles.sectionHead}>
            <h2 id="logos-heading" className={styles.sectionTitle}>
              Logo
            </h2>
            <p className={styles.sectionLede}>
              Full logo, symbol, and wordmark. Prefer SVG when possible.
            </p>
          </div>

          <ul className={styles.logoGrid}>
            {LOGO_ASSETS.map((asset) => (
              <li key={asset.id} className={styles.card}>
                <div
                  className={[
                    styles.previewPane,
                    asset.preview === 'symbol' ? styles.previewPaneSymbol : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                >
                  <LogoPreview kind={asset.preview} />
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{asset.title}</h3>
                  <p className={styles.cardDesc}>{asset.description}</p>
                  <div className={styles.cardActions}>
                    {asset.copySvgHref ? (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => void copySvg(asset.copySvgHref!, asset.title)}
                      >
                        Copy SVG
                      </button>
                    ) : null}
                    {asset.downloads.map((file) => (
                      <a
                        key={file.href}
                        className={styles.actionLink}
                        href={file.href}
                        download
                      >
                        {file.label}
                      </a>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="colors-heading">
          <div className={styles.sectionHead}>
            <h2 id="colors-heading" className={styles.sectionTitle}>
              Colors
            </h2>
            <p className={styles.sectionLede}>
              Primary brand palette. Lavender, amber, action, and deep are accents — not surfaces.
            </p>
          </div>

          <ul className={styles.colorGrid}>
            {BRAND_COLORS.map((color) => (
              <li key={color.token} className={styles.colorCard}>
                <button
                  type="button"
                  className={styles.swatchBtn}
                  style={{ background: color.swatchVar }}
                  onClick={() => void copyHex(color.hex, color.name)}
                  aria-label={`Copy ${color.name} ${color.hex}`}
                >
                  <span className={styles.swatchLabel}>Copy #</span>
                </button>
                <div className={styles.colorMeta}>
                  <p className={styles.colorName}>{color.name}</p>
                  <p className={styles.colorHex}>
                    <code>{color.hex}</code>
                  </p>
                  <p className={styles.colorRole}>{color.role}</p>
                  <p className={styles.colorToken}>
                    <code>{color.token}</code>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.gradientCard}>
            <div className={styles.gradientSwatch} aria-hidden />
            <div className={styles.colorMeta}>
              <p className={styles.colorName}>Brand gradient</p>
              <p className={styles.colorRole}>
                Lavender → rose → amber at 135°. Text on the gradient uses near-black.
              </p>
              <p className={styles.colorToken}>
                <code>lavender → rose → amber</code>
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="fleet-heading">
          <div className={styles.sectionHead}>
            <h2 id="fleet-heading" className={styles.sectionTitle}>
              Fleet
            </h2>
            <p className={styles.sectionLede}>
              Signature fleet imagery with the Armada mark. Use as provided — do not crop into the
              logo awkwardly or stretch the frame.
            </p>
          </div>

          <ul className={styles.fleetGrid}>
            <li className={styles.fleetCard}>
              <div className={styles.fleetMedia}>
                <img
                  src={`${BASE}brand/fleet-logo-1.webp`}
                  alt="Armada fleet with logo, variant 1"
                  width={4096}
                  height={2286}
                  className={styles.fleetImage}
                />
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>Fleet logo 1</h3>
                <p className={styles.cardDesc}>Primary fleet composition with the Armada mark.</p>
                <div className={styles.cardActions}>
                  <a
                    className={styles.actionLink}
                    href={`${BASE}brand/fleet-logo-1.webp`}
                    download
                  >
                    Download WebP
                  </a>
                </div>
              </div>
            </li>
            <li className={styles.fleetCard}>
              <div className={styles.fleetMedia}>
                <img
                  src={`${BASE}brand/fleet-logo-2.webp`}
                  alt="Armada fleet with logo, variant 2"
                  width={4096}
                  height={2286}
                  className={styles.fleetImage}
                />
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>Fleet logo 2</h3>
                <p className={styles.cardDesc}>Alternate fleet composition with the Armada mark.</p>
                <div className={styles.cardActions}>
                  <a
                    className={styles.actionLink}
                    href={`${BASE}brand/fleet-logo-2.webp`}
                    download
                  >
                    Download WebP
                  </a>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© Armada. Assets for approved use only.</p>
      </footer>
    </div>
  )
}
