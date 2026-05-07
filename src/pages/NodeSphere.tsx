import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type NodeKind = 'Hop 0' | 'Hop 1' | 'Hop 2' | 'Multi-hop' | 'Your wallet'

type HoverState = {
  visible: boolean
  x: number
  y: number
  kind: NodeKind
  address: string
  committed: string
}

type NodeMeta = { kind: NodeKind; address: string; committed: string }

export type PinnedNode = { kind: NodeKind; address: string; committed?: string }

const COLORS: Record<NodeKind, number> = {
  'Hop 0': 0x8b5cf6,
  'Hop 1': 0xfb923c,
  'Hop 2': 0xe879f9,
  'Multi-hop': 0x22c55e,
  'Your wallet': 0xfacc15,
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeAddress(rand: () => number) {
  const hex = '0123456789abcdef'
  const pick = () => hex[Math.floor(rand() * hex.length)]
  let out = '0x'
  for (let i = 0; i < 40; i += 1) out += pick()
  return `${out.slice(0, 6)}...${out.slice(-4)}`
}

function makeCommitted(rand: () => number) {
  const v = Math.floor(rand() * 2500) // $0..$2499
  return `$${v.toLocaleString()} committed`
}

function randomUnitVector(rand: () => number) {
  // Uniform unit vector
  const u = rand()
  const v = rand()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

function createCenterNodeTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return { canvas, texture: new THREE.CanvasTexture(canvas) }

  const cx = size / 2
  const cy = size / 2
  const r = 104

  // Background + subtle "frosted" look (approximation of blur).
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(21, 20, 22, 0.62)'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Add a touch of grain to sell the blur/frost.
  ctx.save()
  ctx.globalAlpha = 0.08
  for (let i = 0; i < 420; i += 1) {
    const x = Math.random() * size
    const y = Math.random() * size
    const rr = Math.random() * 1.8
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000'
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Soft glow / depth.
  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 24
  ctx.beginPath()
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Stroke similar to Progress card.
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return { canvas, texture }
}

export interface NodeSphereProps {
  /** When set, the matching node is emphasized. */
  highlightAddress?: string
  /** When set, non-matching nodes are dimmed. */
  filterKind?: 'Hop 0' | 'Hop 1' | 'Hop 2'
  /** Disable pointer interactions so overlays can scroll/capture wheel. */
  interactionDisabled?: boolean
  /**
   * Optional list of nodes to "pin" into the generated graph, by replacing the
   * first N node addresses per kind. Used to connect UI lists to the sphere.
   */
  pinnedNodes?: PinnedNode[]
}

export function NodeSphere({ highlightAddress, filterKind, interactionDisabled, pinnedNodes }: NodeSphereProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [selectedTip, setSelectedTip] = useState<HoverState | null>(null)
  const hoverActiveRef = useRef(false)
  const isDraggingRef = useRef(false)
  const highlightRef = useRef<string | undefined>(highlightAddress)
  const filterRef = useRef<NodeSphereProps['filterKind']>(filterKind)
  const interactionDisabledRef = useRef(!!interactionDisabled)
  const selectedTipRef = useRef<HoverState | null>(null)
  const rendererElRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    highlightRef.current = highlightAddress
  }, [highlightAddress])

  useEffect(() => {
    filterRef.current = filterKind
  }, [filterKind])

  useEffect(() => {
    interactionDisabledRef.current = !!interactionDisabled
  }, [interactionDisabled])

  useEffect(() => {
    const el = rendererElRef.current
    if (!el) return
    el.style.pointerEvents = interactionDisabled ? 'none' : 'auto'
  }, [interactionDisabled])

  // Stable id so we can safely attach events once.
  const instanceId = useMemo(() => Math.random().toString(36).slice(2), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
    const Z_MIN = 6
    const Z_MAX = 28
    // Start at max zoom (closest)
    camera.position.z = Z_MIN

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.pointerEvents = interactionDisabled ? 'none' : 'auto'
    rendererElRef.current = renderer.domElement
    host.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const rand = mulberry32(1337)

    const EDGE_DISTANCE = 3.2
    const NODE_RADIUS = 0.085

    const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS, 14, 14)
    const baseMaterialsByKind = new Map<NodeKind, THREE.MeshBasicMaterial>(
      (Object.keys(COLORS) as NodeKind[]).map(kind => ([
        kind,
        new THREE.MeshBasicMaterial({
          color: COLORS[kind],
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        }),
      ])),
    )

    const nodeMeshes: THREE.Mesh[] = []
    const nodePositions: THREE.Vector3[] = []
    const hop0Positions: THREE.Vector3[] = []

    const shells: Array<{ kind: NodeKind; count: number; radius: number }> = [
      { kind: 'Hop 0', count: 18, radius: 2.4 },
      { kind: 'Hop 1', count: 26, radius: 3.6 },
      { kind: 'Hop 2', count: 30, radius: 5.1 },
      { kind: 'Multi-hop', count: 10, radius: 6.4 },
    ]

    const pinnedByKind = new Map<NodeKind, PinnedNode[]>()
    if (pinnedNodes?.length) {
      for (const p of pinnedNodes) {
        const list = pinnedByKind.get(p.kind) ?? []
        list.push(p)
        pinnedByKind.set(p.kind, list)
      }
    }
    const pinnedIndex = new Map<NodeKind, number>()
    const takePinned = (kind: NodeKind): PinnedNode | null => {
      const list = pinnedByKind.get(kind)
      if (!list?.length) return null
      const idx = pinnedIndex.get(kind) ?? 0
      if (idx >= list.length) return null
      pinnedIndex.set(kind, idx + 1)
      return list[idx]
    }

    const pushNode = (pos: THREE.Vector3, meta: NodeMeta) => {
      nodePositions.push(pos)
      const mesh = new THREE.Mesh(nodeGeometry, baseMaterialsByKind.get(meta.kind)!.clone())
      mesh.position.copy(pos)
      mesh.userData = meta
      group.add(mesh)
      nodeMeshes.push(mesh)

      if (meta.kind === 'Hop 0') hop0Positions.push(pos.clone())
    }

    for (const shell of shells) {
      for (let i = 0; i < shell.count; i += 1) {
        const dir = randomUnitVector(rand)
        const jitter = (rand() - 0.5) * 0.18
        const pos = dir.multiplyScalar(shell.radius + jitter)
        const pinned = takePinned(shell.kind)
        pushNode(pos, {
          kind: shell.kind,
          address: pinned?.address ?? makeAddress(rand),
          committed: pinned?.committed ?? makeCommitted(rand),
        })
      }
    }

    // Exactly one wallet node (outer ring-ish).
    pushNode(randomUnitVector(rand).multiplyScalar(5.8), {
      kind: 'Your wallet',
      address: makeAddress(rand),
      committed: '$0 committed',
    })

    // Center node (Armada symbol inside frosted circle) as a true 3D sprite.
    const { texture: centerBgTexture } = createCenterNodeTexture()
    const centerMat = new THREE.SpriteMaterial({
      map: centerBgTexture,
      transparent: true,
      depthWrite: false,
    })
    const centerSprite = new THREE.Sprite(centerMat)
    centerSprite.position.set(0, 0, 0)
    // World-space size so it zooms/scales with the sphere (like other nodes).
    centerSprite.scale.set(0.9, 0.9, 1)

    // Load and draw the SVG symbol into the same canvas texture.
    const img = new Image()
    img.onload = () => {
      const canvas = centerBgTexture.image as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const size = canvas.width
      const cx = size / 2
      const cy = size / 2
      const symbolSize = 140
      ctx.save()
      ctx.globalAlpha = 1
      ctx.drawImage(img, cx - symbolSize / 2, cy - symbolSize / 2, symbolSize, symbolSize)
      ctx.restore()
      centerBgTexture.needsUpdate = true
    }
    img.src = '/armada-symbol.svg'

    group.add(centerSprite)

    const edgePositions: number[] = []
    // Connect center to all Hop 0 nodes.
    for (const p of hop0Positions) {
      edgePositions.push(0, 0, 0, p.x, p.y, p.z)
    }
    for (let i = 0; i < nodePositions.length; i += 1) {
      for (let j = i + 1; j < nodePositions.length; j += 1) {
        if (nodePositions[i].distanceTo(nodePositions[j]) <= EDGE_DISTANCE) {
          const a = nodePositions[i]
          const b = nodePositions[j]
          edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z)
        }
      }
    }

    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xc491e5,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    group.add(edges)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: THREE.Mesh | null = null
    let dragLastX = 0
    let dragLastY = 0

    let raf = 0
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragLastX
        const dy = e.clientY - dragLastY
        dragLastX = e.clientX
        dragLastY = e.clientY

        // Drag rotation: right-drag rotates around Y, up/down rotates around X.
        group.rotation.y += dx * 0.006
        group.rotation.x += dy * 0.004
        return
      }

      const rect = renderer.domElement.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      pointer.x = (x / rect.width) * 2 - 1
      pointer.y = -(y / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(nodeMeshes, false)
      const hit = hits[0]?.object as THREE.Mesh | undefined

      if (hit && hit.userData?.kind) {
        hovered = hit
        const meta = hit.userData as NodeMeta
        hoverActiveRef.current = true
        setHover({
          visible: true,
          x: e.clientX + 14,
          y: e.clientY + 14,
          kind: meta.kind,
          address: meta.address,
          committed: meta.committed,
        })
      } else {
        hovered = null
        hoverActiveRef.current = false
        setHover(null)
      }
    }

    const onPointerLeave = () => {
      hovered = null
      hoverActiveRef.current = false
      setHover(null)
    }

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true
      dragLastX = e.clientX
      dragLastY = e.clientY
      hoverActiveRef.current = false
      setHover(null)
      renderer.domElement.setPointerCapture(e.pointerId)
    }

    const onPointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false
      try {
        renderer.domElement.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    const onWheel = (e: WheelEvent) => {
      // If a UI overlay is on top (e.g. the participants list), don't hijack the wheel.
      // In some browsers, the canvas can still receive wheel events even when visually covered.
      const top = document.elementFromPoint(e.clientX, e.clientY)
      if (top && top !== renderer.domElement && !renderer.domElement.contains(top)) return

      e.preventDefault()
      const next = camera.position.z + e.deltaY * 0.01
      camera.position.z = Math.max(Z_MIN, Math.min(Z_MAX, next))
    }

    let targetRotX: number | null = null
    let targetRotY: number | null = null
    let lastCenteredAddress: string | null = null

    const computeCenterRotation = (m: THREE.Mesh) => {
      const v = m.position.clone().normalize()
      const yAxis = new THREE.Vector3(0, 1, 0)
      const yaw = -Math.atan2(v.x, v.z)
      const vYaw = v.clone().applyAxisAngle(yAxis, yaw)
      const pitch = Math.atan2(vYaw.y, vYaw.z)
      targetRotY = yaw
      targetRotX = pitch
    }

    const animate = () => {
      const selectedAddr = highlightRef.current
      const shouldAutoRotate = !selectedAddr && !hoverActiveRef.current && !isDraggingRef.current
      if (shouldAutoRotate) {
        group.rotation.y += 0.001
        group.rotation.x += 0.0003
      }

      // Subtle emphasis on hovered node.
      for (const m of nodeMeshes) {
        const isHovered = hovered === m
        const meta = m.userData as NodeMeta
        const isSelected = !!selectedAddr && meta.address === selectedAddr
        const activeFilter = filterRef.current
        const isFilteredOut = !!activeFilter && meta.kind !== activeFilter && meta.kind !== 'Your wallet'
        const target = Math.max(isHovered ? 1.35 : 1, isSelected ? 1.55 : 1)
        const s = m.scale.x + (target - m.scale.x) * 0.15
        m.scale.setScalar(s)

        const mat = m.material as THREE.MeshBasicMaterial
        const targetOpacity = isSelected ? 1 : isFilteredOut ? 0.08 : 0.6
        mat.opacity = mat.opacity + (targetOpacity - mat.opacity) * 0.12
      }

      // Center selected node in view by rotating the group.
      if (selectedAddr && !isDraggingRef.current) {
        if (lastCenteredAddress !== selectedAddr) {
          const selectedMesh = nodeMeshes.find((m) => (m.userData as NodeMeta).address === selectedAddr) ?? null
          if (selectedMesh) computeCenterRotation(selectedMesh)
          lastCenteredAddress = selectedAddr
        }

        if (targetRotX != null && targetRotY != null) {
          group.rotation.x += (targetRotX - group.rotation.x) * 0.08
          group.rotation.y += (targetRotY - group.rotation.y) * 0.08
        }
      } else {
        lastCenteredAddress = null
        targetRotX = null
        targetRotY = null
      }

      // Keep selected tooltip pinned near the selected node (when not hovering other nodes).
      if (selectedAddr && !hoverActiveRef.current) {
        const selectedMesh = nodeMeshes.find((m) => (m.userData as NodeMeta).address === selectedAddr) ?? null
        if (selectedMesh) {
          const meta = selectedMesh.userData as NodeMeta
          const pos = selectedMesh.position.clone()
          // position is in group local space; apply group rotation.
          pos.applyEuler(group.rotation)
          const projected = pos.project(camera)
          const rect = renderer.domElement.getBoundingClientRect()
          const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width + 14
          const y = rect.top + (-projected.y * 0.5 + 0.5) * rect.height - 12

          const next: HoverState = {
            visible: true,
            x,
            y,
            kind: meta.kind,
            address: meta.address,
            committed: meta.committed,
          }

          const prev = selectedTipRef.current
          const shouldUpdate =
            !prev ||
            prev.address !== next.address ||
            Math.abs(prev.x - next.x) > 0.5 ||
            Math.abs(prev.y - next.y) > 0.5

          if (shouldUpdate) {
            selectedTipRef.current = next
            setSelectedTip(next)
          }
        }
      } else if (selectedTipRef.current) {
        selectedTipRef.current = null
        setSelectedTip(null)
      }

      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    // Tie events to renderer canvas so the sphere stays centered regardless of layout.
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    raf = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.cancelAnimationFrame(raf)

      group.clear()
      nodeGeometry.dispose()
      for (const mat of baseMaterialsByKind.values()) mat.dispose()
      edgeGeometry.dispose()
      edgeMaterial.dispose()
      centerBgTexture.dispose()
      centerMat.dispose()

      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [instanceId, pinnedNodes])

  return (
    <div
      ref={hostRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
      }}
    >
      {/* Hover tooltip */}
      {hover?.visible && (
        <div
          style={{
            position: 'fixed',
            left: hover.x,
            top: hover.y,
            zIndex: 30,
            width: '272px',
            padding: 'var(--primitives-spacing-5)',
            borderRadius: 'var(--semantic-borderRadius-card)',
            border: '1px solid color-mix(in srgb, var(--semantic-color-text-primary) 16%, transparent)',
            background: 'color-mix(in srgb, var(--semantic-color-surface-default) 55%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'var(--semantic-color-text-secondary)',
            fontFamily: 'var(--primitives-fontFamily-ui), sans-serif',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: 'var(--primitives-fontSize-xs)',
              letterSpacing: 'var(--primitives-letterSpacing-widest)',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginBottom: 'var(--primitives-spacing-3)',
            }}
          >
            NODE
          </div>
          <div
            style={{
              fontFamily: 'var(--primitives-fontFamily-mono), monospace',
              fontSize: 'var(--primitives-fontSize-2xl)',
              letterSpacing: 'var(--primitives-letterSpacing-tight)',
              color: 'var(--semantic-color-text-primary)',
              marginBottom: 'var(--primitives-spacing-3)',
            }}
          >
            {hover.address}
          </div>
          <div style={{ fontSize: 'var(--primitives-fontSize-lg)', opacity: 0.8, marginBottom: 'var(--primitives-spacing-2)' }}>
            {hover.committed}
          </div>
          <div style={{ fontSize: 'var(--primitives-fontSize-lg)', opacity: 0.75 }}>
            {hover.kind}
          </div>
        </div>
      )}

      {/* Selected tooltip (pinned) */}
      {!hover?.visible && selectedTip?.visible && (
        <div
          style={{
            position: 'fixed',
            left: selectedTip.x,
            top: selectedTip.y,
            zIndex: 29,
            width: '272px',
            padding: 'var(--primitives-spacing-5)',
            borderRadius: 'var(--semantic-borderRadius-card)',
            border: '1px solid color-mix(in srgb, var(--semantic-color-text-primary) 16%, transparent)',
            background: 'color-mix(in srgb, var(--semantic-color-surface-default) 55%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'var(--semantic-color-text-secondary)',
            fontFamily: 'var(--primitives-fontFamily-ui), sans-serif',
            pointerEvents: 'none',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: 'var(--primitives-fontSize-xs)',
              letterSpacing: 'var(--primitives-letterSpacing-widest)',
              textTransform: 'uppercase',
              color: 'var(--semantic-color-text-dim)',
              marginBottom: 'var(--primitives-spacing-2)',
            }}
          >
            {selectedTip.kind}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--semantic-color-text-primary)' }}>
            {selectedTip.address}
          </div>
          <div style={{ marginTop: 'var(--primitives-spacing-2)', color: 'var(--semantic-color-text-muted)' }}>
            {selectedTip.committed}
          </div>
        </div>
      )}
    </div>
  )
}

