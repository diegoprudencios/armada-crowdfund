import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

type NodeKind = 'Hop 0' | 'Hop 1' | 'Hop 2' | 'Multi-hop' | 'Your wallet'

type HoverState = {
  visible: boolean
  x: number
  y: number
  kind: NodeKind
  address: string
  committed: string
}

type NodeMeta = { kind: NodeKind; address: string; committed: string; ghost?: boolean }

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
  /** Notify when a node is selected via click. */
  onSelectAddress?: (address: string | undefined) => void
  /** When set, non-matching nodes are dimmed. */
  filterKind?: 'Hop 0' | 'Hop 1' | 'Hop 2'
  /** Disable pointer interactions so overlays can scroll/capture wheel. */
  interactionDisabled?: boolean
  /**
   * Optional list of nodes to "pin" into the generated graph, by replacing the
   * first N node addresses per kind. Used to connect UI lists to the sphere.
   */
  pinnedNodes?: PinnedNode[]
  /** Participant scenario size chosen by the page (stable per reload). */
  scenarioParticipants?: 0 | 3 | 4 | 5 | 30 | 800
  /** Seed for deterministic layout within a single reload. */
  scenarioSeed?: number
}

export function NodeSphere({
  highlightAddress,
  onSelectAddress,
  filterKind,
  interactionDisabled,
  pinnedNodes,
  scenarioParticipants,
  scenarioSeed,
}: NodeSphereProps) {
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

  const scenario = useMemo(() => {
    const participants = scenarioParticipants ?? 30
    const id =
      participants === 0 ? ('empty' as const) : participants <= 5 ? ('small' as const) : participants === 30 ? ('mid' as const) : ('large' as const)
    return { id, participants }
  }, [scenarioParticipants])

  const seed = useMemo(() => {
    // Stable per mount, changes on reload unless caller provides a seed.
    return scenarioSeed ?? Math.floor(Math.random() * 1_000_000_000)
  }, [scenarioSeed])

  // Avoid tearing down/recreating Three.js scene due to new array references.
  const pinnedNodesKey = useMemo(() => {
    if (!pinnedNodes?.length) return ''
    return pinnedNodes
      .map((p) => `${p.kind}:${p.address}:${p.committed ?? ''}`)
      .join('|')
  }, [pinnedNodes])

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

    // Root handles free rotation (auto + drag). Focus handles selection-centering offset.
    const root = new THREE.Group()
    const focus = new THREE.Group()
    root.add(focus)
    scene.add(root)

    const rand = mulberry32(seed)

    const NODE_RADIUS = 0.085

    // Higher segment count so nodes read as true circles.
    const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS, 28, 20)
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
    const indicesByKind = new Map<NodeKind, number[]>()
    const indexByAddress = new Map<string, number>()

    const shellRadii: Array<{ kind: NodeKind; radius: number }> = [
      { kind: 'Hop 0', radius: 2.4 },
      { kind: 'Hop 1', radius: 3.6 },
      { kind: 'Hop 2', radius: 5.1 },
      { kind: 'Multi-hop', radius: 6.4 },
    ]

    const scenarioCounts = (() => {
      // We cap rendering for large (800) so performance stays good.
      if (scenario.id === 'empty') {
        return {
          real: { hop0: 0, hop1: 0, hop2: 0, multi: 0 },
          ghost: { hop0: 6, hop1: 10, hop2: 14, multi: 0 },
        }
      }
      if (scenario.id === 'small') {
        const n = scenario.participants
        const hop0 = Math.max(1, Math.round(n * 0.6))
        const hop1 = Math.max(0, Math.round(n * 0.3))
        const hop2 = Math.max(0, n - hop0 - hop1)
        return {
          real: { hop0, hop1, hop2, multi: 0 },
          ghost: { hop0: 10, hop1: 12, hop2: 14, multi: 0 },
        }
      }
      if (scenario.id === 'mid') {
        return {
          real: { hop0: 10, hop1: 10, hop2: 10, multi: 0 },
          ghost: { hop0: 0, hop1: 0, hop2: 0, multi: 0 },
        }
      }
      // large
      return {
        real: { hop0: 60, hop1: 70, hop2: 70, multi: 18 },
        ghost: { hop0: 0, hop1: 0, hop2: 0, multi: 0 },
      }
    })()

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
      const mat = baseMaterialsByKind.get(meta.kind)!.clone()
      if (meta.ghost) {
        mat.color = new THREE.Color(0xa1a1aa)
        mat.opacity = 0.12
      }
      const mesh = new THREE.Mesh(nodeGeometry, mat)
      mesh.position.copy(pos)
      mesh.userData = meta
      focus.add(mesh)
      nodeMeshes.push(mesh)

      const idx = nodeMeshes.length - 1
      if (!meta.ghost) {
        const list = indicesByKind.get(meta.kind) ?? []
        list.push(idx)
        indicesByKind.set(meta.kind, list)
        indexByAddress.set(meta.address, idx)
      }
    }

    const addShell = (kind: NodeKind, radius: number, realCount: number, ghostCount: number) => {
      const total = realCount + ghostCount
      for (let i = 0; i < total; i += 1) {
        const dir = randomUnitVector(rand)
        const jitter = (rand() - 0.5) * 0.18
        const pos = dir.multiplyScalar(radius + jitter)
        const pinned = takePinned(kind)
        const ghost = i >= realCount
        pushNode(pos, {
          kind,
          address: pinned?.address ?? makeAddress(rand),
          committed: pinned?.committed ?? makeCommitted(rand),
          ghost,
        })
      }
    }

    addShell('Hop 0', shellRadii[0].radius, scenarioCounts.real.hop0, scenarioCounts.ghost.hop0)
    addShell('Hop 1', shellRadii[1].radius, scenarioCounts.real.hop1, scenarioCounts.ghost.hop1)
    addShell('Hop 2', shellRadii[2].radius, scenarioCounts.real.hop2, scenarioCounts.ghost.hop2)
    addShell('Multi-hop', shellRadii[3].radius, scenarioCounts.real.multi, scenarioCounts.ghost.multi)

    // Exactly one wallet node (outer ring-ish). Omit when there are no participants.
    if (scenario.participants > 0) {
      const walletPos = randomUnitVector(rand).multiplyScalar(5.8)
      pushNode(walletPos, {
        kind: 'Your wallet',
        address: makeAddress(rand),
        committed: '$0 committed',
      })
    }

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

    focus.add(centerSprite)

    const edgePositions: number[] = []
    const edgePairs: Array<[number, number]> = []

    const connectNearest = (fromIdxs: number[], toIdxs: number[], perFrom: number) => {
      if (!fromIdxs.length || !toIdxs.length) return
      const capped = Math.max(1, Math.min(6, perFrom))
      for (const aIdx of fromIdxs) {
        const a = nodePositions[aIdx]
        const best: Array<{ d: number; idx: number }> = []
        for (const bIdx of toIdxs) {
          const b = nodePositions[bIdx]
          const d = a.distanceToSquared(b)
          // Insert into sorted list (small N so O(N^2) is fine).
          let inserted = false
          for (let i = 0; i < best.length; i += 1) {
            if (d < best[i].d) {
              best.splice(i, 0, { d, idx: bIdx })
              inserted = true
              break
            }
          }
          if (!inserted) best.push({ d, idx: bIdx })
          if (best.length > capped) best.length = capped
        }
        for (const { idx: bIdx } of best) {
          const b = nodePositions[bIdx]
          edgePositions.push(a.x, a.y, a.z, b.x, b.y, b.z)
          edgePairs.push([aIdx, bIdx])
        }
      }
    }

    // Layered wiring: center → Seed, then Seed → Hop 1 → Hop 2 → Multi-hop.
    const hop0 = indicesByKind.get('Hop 0') ?? []
    const hop1 = indicesByKind.get('Hop 1') ?? []
    const hop2 = indicesByKind.get('Hop 2') ?? []
    const multi = indicesByKind.get('Multi-hop') ?? []

    // Keep a strong-ish "origin" relationship but not overly dense.
    // (No per-segment coloring for center links yet; keep them subtle by leaving them out.)

    // Keep it sparse so it reads as layered, not webbed.
    connectNearest(hop0, hop1, 1)
    connectNearest(hop1, hop2, 1)
    connectNearest(hop2, multi, 1)

    // Wallet should connect to a single Seed node (more realistic).
    if (hop0.length) {
      // Create a synthetic "node index" for wallet by reusing its mesh index (it exists in nodes list).
      const walletIdx = indicesByKind.get('Your wallet')?.[0]
      if (walletIdx != null) connectNearest([walletIdx], hop0, 1)
    }

    const edgeGeometry = new THREE.BufferGeometry()
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))
    const edgeColorArray = new Float32Array((edgePositions.length / 3) * 3)
    for (let i = 0; i < edgeColorArray.length; i += 3) {
      edgeColorArray[i + 0] = 0.78
      edgeColorArray[i + 1] = 0.57
      edgeColorArray[i + 2] = 0.9
    }
    edgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(edgeColorArray, 3))
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xc491e5,
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
    focus.add(edges)

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
        root.rotation.y += dx * 0.006
        root.rotation.x += dy * 0.004
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

      if (hit && hit.userData?.kind && !(hit.userData as NodeMeta).ghost) {
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

      if (!onSelectAddress) return

      // Click-to-select: raycast on pointer up.
      const rect = renderer.domElement.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      pointer.x = (x / rect.width) * 2 - 1
      pointer.y = -(y / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(nodeMeshes, false)
      const hit = hits[0]?.object as THREE.Mesh | undefined
      const meta = hit?.userData as NodeMeta | undefined
      const addr = meta && !meta.ghost ? meta.address : undefined
      const current = highlightRef.current
      onSelectAddress(addr && addr !== current ? addr : undefined)
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

    const identityQuat = new THREE.Quaternion()
    let targetFocusQuat: THREE.Quaternion | null = null
    let lastCenteredAddress: string | null = null
    let lastHighlightedAddress: string | null = null
    let hadSelection = false

    const edgeColorAttr = edgeGeometry.getAttribute('color') as THREE.BufferAttribute
    const setEdgeColorForSegment = (segIndex: number, r: number, g: number, b: number) => {
      const i = segIndex * 6
      // Each segment has 2 vertices; set both
      edgeColorArray[i + 0] = r
      edgeColorArray[i + 1] = g
      edgeColorArray[i + 2] = b
      edgeColorArray[i + 3] = r
      edgeColorArray[i + 4] = g
      edgeColorArray[i + 5] = b
    }

    const updateEdgeHighlight = (addr: string | null) => {
      if (addr === lastHighlightedAddress) return
      lastHighlightedAddress = addr

      // Reset all edges to dim.
      for (let s = 0; s < edgePairs.length; s += 1) setEdgeColorForSegment(s, 0.78, 0.57, 0.9)

      if (!addr) {
        edgeColorAttr.needsUpdate = true
        return
      }

      const idx = indexByAddress.get(addr)
      if (idx == null) {
        edgeColorAttr.needsUpdate = true
        return
      }

      // Highlight edges that touch the selected node (its "path" to nearest nodes).
      for (let s = 0; s < edgePairs.length; s += 1) {
        const [a, b] = edgePairs[s]
        if (a === idx || b === idx) {
          setEdgeColorForSegment(s, 1, 0.94, 0.78) // warm highlight
        }
      }

      edgeColorAttr.needsUpdate = true
    }

    const animate = () => {
      const selectedAddr = highlightRef.current
      updateEdgeHighlight(selectedAddr ?? null)

      // If we just deselected, bake the current focused orientation into root first,
      // then reset focus to identity. This preserves the exact current frame.
      if (!selectedAddr && hadSelection) {
        root.quaternion.multiply(focus.quaternion)
        focus.quaternion.copy(identityQuat)
        hadSelection = false
        targetFocusQuat = null
        lastCenteredAddress = null
      }

      const shouldAutoRotate = !selectedAddr && !hoverActiveRef.current && !isDraggingRef.current
      if (shouldAutoRotate) {
        root.rotation.y += 0.001
        root.rotation.x += 0.0003
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
        const base = meta.ghost ? 0.12 : 0.6
        const targetOpacity = isSelected ? 1 : isFilteredOut ? (meta.ghost ? 0.06 : 0.08) : base
        mat.opacity = mat.opacity + (targetOpacity - mat.opacity) * 0.12
      }

      // Center selected node in view by rotating the focus group (root keeps continuity).
      if (selectedAddr && !isDraggingRef.current) {
        hadSelection = true
        if (lastCenteredAddress !== selectedAddr) {
          const selectedMesh = nodeMeshes.find((m) => (m.userData as NodeMeta).address === selectedAddr) ?? null
          if (selectedMesh) {
            const desiredWorld = new THREE.Vector3(0, 0, 1)
            const desiredInFocusSpace = desiredWorld.clone().applyQuaternion(root.quaternion.clone().invert()).normalize()
            const from = selectedMesh.position.clone().normalize()
            targetFocusQuat = new THREE.Quaternion().setFromUnitVectors(from, desiredInFocusSpace)
          }
          lastCenteredAddress = selectedAddr
        }
        if (targetFocusQuat) focus.quaternion.slerp(targetFocusQuat, 0.08)
      } else {
        lastCenteredAddress = null
        targetFocusQuat = null
      }

      // Keep selected tooltip pinned near the selected node (when not hovering other nodes).
      if (selectedAddr && !hoverActiveRef.current) {
        const selectedMesh = nodeMeshes.find((m) => (m.userData as NodeMeta).address === selectedAddr) ?? null
        if (selectedMesh) {
          const meta = selectedMesh.userData as NodeMeta
          const world = new THREE.Vector3()
          selectedMesh.getWorldPosition(world)
          const projected = world.project(camera)
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

      root.clear()
      nodeGeometry.dispose()
      for (const mat of baseMaterialsByKind.values()) mat.dispose()
      edgeGeometry.dispose()
      edgeMaterial.dispose()
      centerBgTexture.dispose()
      centerMat.dispose()

      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [instanceId, pinnedNodesKey, seed])

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
            borderRadius: 'calc(var(--semantic-borderRadius-card) * 1px)',
            border: '1px solid color-mix(in srgb, var(--semantic-color-text-primary) 16%, transparent)',
            background: 'color-mix(in srgb, var(--semantic-color-surface-default) 55%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'var(--semantic-color-text-secondary)',
            fontFamily: 'var(--primitives-fontFamily-ui), sans-serif',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 'var(--primitives-spacing-4)',
              right: 'var(--primitives-spacing-4)',
              width: 16,
              height: 16,
              color: 'var(--semantic-color-text-dim)',
              opacity: 0.9,
            }}
            aria-hidden
          >
            <ArrowTopRightOnSquareIcon width={16} height={16} />
          </div>
          <div
            style={{
              fontSize: 'var(--semantic-component-tag-font-size)',
              letterSpacing: 'var(--primitives-letterSpacing-widest)',
              textTransform: 'uppercase',
              color: 'var(--semantic-color-text-secondary)',
              marginBottom: 'var(--primitives-spacing-2)',
            }}
          >
            {hover.kind}
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
            borderRadius: 'calc(var(--semantic-borderRadius-card) * 1px)',
            border: '1px solid color-mix(in srgb, var(--semantic-color-text-primary) 16%, transparent)',
            background: 'color-mix(in srgb, var(--semantic-color-surface-default) 55%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            color: 'var(--semantic-color-text-secondary)',
            fontFamily: 'var(--primitives-fontFamily-ui), sans-serif',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 'var(--primitives-spacing-4)',
              right: 'var(--primitives-spacing-4)',
              width: 16,
              height: 16,
              color: 'var(--semantic-color-text-dim)',
              opacity: 0.9,
            }}
            aria-hidden
          >
            <ArrowTopRightOnSquareIcon width={16} height={16} />
          </div>
          <div
            style={{
              fontSize: 'var(--semantic-component-tag-font-size)',
              letterSpacing: 'var(--primitives-letterSpacing-widest)',
              textTransform: 'uppercase',
              color: 'var(--semantic-color-text-secondary)',
              marginBottom: 'var(--primitives-spacing-2)',
            }}
          >
            {selectedTip.kind}
          </div>
          <div
            style={{
              fontFamily: 'var(--primitives-fontFamily-mono), monospace',
              fontSize: 'calc(var(--primitives-fontSize-lg) * 1px)',
              fontWeight: 600,
              color: 'var(--semantic-color-text-primary)',
            }}
          >
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

