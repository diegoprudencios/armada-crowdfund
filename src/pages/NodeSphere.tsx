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

type NodeMeta = { kind: NodeKind; address: string; committed: string; ghost?: boolean; multiHop?: boolean; inviter?: string }

export type PinnedNode = { kind: NodeKind; address: string; committed?: string; multiHop?: boolean; inviter?: string }

// Feature flag for the hover-on-node tooltip. JSX is kept intact below so
// flipping this back to true restores the previous behavior.
const SHOW_HOVER_POPUP = false

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

// Return a unit vector within a spherical cap of half-angle `halfAngleRad`
// centered on `base`. Used to cluster a node near its inviter on the sphere.
function jitterDirectionNear(base: THREE.Vector3, rand: () => number, halfAngleRad: number) {
  // Pick a uniformly random axis perpendicular to base by sampling a random
  // unit vector and projecting onto base's tangent plane.
  const r = randomUnitVector(rand)
  const perp = r.sub(base.clone().multiplyScalar(r.dot(base)))
  if (perp.lengthSq() < 1e-8) perp.set(1, 0, 0)
  perp.normalize()
  // Uniform distribution over the cap area uses sqrt of a uniform draw.
  const t = Math.sqrt(rand()) * halfAngleRad
  const c = Math.cos(t)
  const s = Math.sin(t)
  return base.clone().multiplyScalar(c).add(perp.multiplyScalar(s))
}

function createMultiHopRingTexture() {
  // Soft green ring drawn into a square canvas; used as a billboard halo on
  // multi-hop nodes so it always reads as a ring regardless of camera angle.
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  if (!ctx) return texture

  const cx = size / 2
  const cy = size / 2
  // Outer halo: wider, softer.
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.shadowColor = 'rgba(34,197,94,0.95)'
  ctx.shadowBlur = 18
  ctx.strokeStyle = 'rgba(74,222,128,0.95)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(cx, cy, 42, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Inner crisp ring for definition.
  ctx.strokeStyle = 'rgba(187,247,208,0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, 42, 0, Math.PI * 2)
  ctx.stroke()

  texture.needsUpdate = true
  return texture
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
  filterKind?: 'Hop 0' | 'Hop 1' | 'Hop 2' | 'Multi-hop'
  /** Disable pointer interactions so overlays can scroll/capture wheel. */
  interactionDisabled?: boolean
  /**
   * Optional list of nodes to "pin" into the generated graph, by replacing the
   * first N node addresses per kind. Used to connect UI lists to the sphere.
   */
  pinnedNodes?: PinnedNode[]
  /** Participant scenario size chosen by the page (stable per reload). 0 means
   *  pre-launch (ghost-only sphere); any positive number means active. */
  scenarioParticipants?: number
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
    const participants = scenarioParticipants ?? 0
    const id = participants === 0 ? ('empty' as const) : ('active' as const)
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
    // Start partway out so the full sphere is visible without feeling distant.
    camera.position.z = 14

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
    // Parallel to nodeMeshes; entry is the halo material when the node is
    // multi-hop, otherwise null. Each multi-hop node gets its own material
    // clone so lineage dimming can fade halos individually.
    const haloMaterials: Array<THREE.SpriteMaterial | null> = []

    // Template material for the multi-hop halo billboard. Cloned per node so
    // each instance can be dimmed independently.
    const multiHopRingTexture = createMultiHopRingTexture()
    const multiHopRingMaterialTemplate = new THREE.SpriteMaterial({
      map: multiHopRingTexture,
      transparent: true,
      depthWrite: false,
    })

    const shellRadii: Array<{ kind: NodeKind; radius: number }> = [
      { kind: 'Hop 0', radius: 2.4 },
      { kind: 'Hop 1', radius: 3.6 },
      { kind: 'Hop 2', radius: 5.1 },
      { kind: 'Multi-hop', radius: 6.4 },
    ]

    const pinnedByKind = new Map<NodeKind, PinnedNode[]>()
    if (pinnedNodes?.length) {
      for (const p of pinnedNodes) {
        const list = pinnedByKind.get(p.kind) ?? []
        list.push(p)
        pinnedByKind.set(p.kind, list)
      }
    }

    const scenarioCounts = (() => {
      // When a pinned dataset is provided (the live crowdfund mock), render
      // exactly one node per pinned entry on each shell. No synthetic padding.
      if (pinnedNodes?.length) {
        return {
          real: {
            hop0: pinnedByKind.get('Hop 0')?.length ?? 0,
            hop1: pinnedByKind.get('Hop 1')?.length ?? 0,
            hop2: pinnedByKind.get('Hop 2')?.length ?? 0,
            multi: pinnedByKind.get('Multi-hop')?.length ?? 0,
          },
          ghost: { hop0: 0, hop1: 0, hop2: 0, multi: 0 },
        }
      }
      // Fallback for the empty (pre-launch) scenario: a sparse set of ghost
      // nodes so the sphere still has visual content.
      return {
        real: { hop0: 0, hop1: 0, hop2: 0, multi: 0 },
        ghost: { hop0: 6, hop1: 10, hop2: 14, multi: 0 },
      }
    })()
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

      let haloMat: THREE.SpriteMaterial | null = null
      if (meta.multiHop && !meta.ghost) {
        haloMat = multiHopRingMaterialTemplate.clone()
        const halo = new THREE.Sprite(haloMat)
        const haloScale = NODE_RADIUS * 5.2
        halo.scale.set(haloScale, haloScale, 1)
        mesh.add(halo)
      }
      haloMaterials.push(haloMat)

      const idx = nodeMeshes.length - 1
      if (!meta.ghost) {
        const list = indicesByKind.get(meta.kind) ?? []
        list.push(idx)
        indicesByKind.set(meta.kind, list)
        indexByAddress.set(meta.address, idx)
      }
    }

    // Half-angle of the spherical cap a child node may occupy around its
    // inviter's direction. Tighter on outer shells so clusters read clearly.
    const CLUSTER_HALF_ANGLE: Partial<Record<NodeKind, number>> = {
      'Hop 1': 0.28,
      'Hop 2': 0.22,
    }

    const addShell = (kind: NodeKind, radius: number, realCount: number, ghostCount: number) => {
      const total = realCount + ghostCount
      const clusterAngle = CLUSTER_HALF_ANGLE[kind]
      for (let i = 0; i < total; i += 1) {
        const ghost = i >= realCount
        const pinned = ghost ? null : takePinned(kind)

        let dir: THREE.Vector3
        const inviter = pinned?.inviter
        if (clusterAngle && inviter && inviter !== 'Armada') {
          const parentIdx = indexByAddress.get(inviter)
          if (parentIdx != null) {
            const parentDir = nodePositions[parentIdx].clone().normalize()
            dir = jitterDirectionNear(parentDir, rand, clusterAngle)
          } else {
            dir = randomUnitVector(rand)
          }
        } else {
          dir = randomUnitVector(rand)
        }

        const jitter = (rand() - 0.5) * 0.18
        const pos = dir.multiplyScalar(radius + jitter)
        pushNode(pos, {
          kind,
          address: pinned?.address ?? makeAddress(rand),
          committed: pinned?.committed ?? makeCommitted(rand),
          ghost,
          multiHop: pinned?.multiHop,
          inviter: pinned?.inviter,
        })
      }
    }

    addShell('Hop 0', shellRadii[0].radius, scenarioCounts.real.hop0, scenarioCounts.ghost.hop0)
    addShell('Hop 1', shellRadii[1].radius, scenarioCounts.real.hop1, scenarioCounts.ghost.hop1)
    addShell('Hop 2', shellRadii[2].radius, scenarioCounts.real.hop2, scenarioCounts.ghost.hop2)
    addShell('Multi-hop', shellRadii[3].radius, scenarioCounts.real.multi, scenarioCounts.ghost.multi)

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
    // Each edge endpoint is either a wallet address or the sentinel 'Armada'
    // (which corresponds to the center sprite, not a node in nodeMeshes).
    const edgePairs: Array<[string, string]> = []

    // Invite-tree maps used both for edge construction and selection lineage walks.
    const parentOf = new Map<string, string>()
    const childrenOf = new Map<string, string[]>()

    // Build one edge per non-Armada wallet to its inviter. Armada-direct
    // wallets get an edge to the center (0,0,0).
    for (let i = 0; i < nodeMeshes.length; i += 1) {
      const m = nodeMeshes[i]
      const meta = m.userData as NodeMeta
      if (meta.ghost) continue
      const inviter = meta.inviter
      if (!inviter) continue

      parentOf.set(meta.address, inviter)
      const siblings = childrenOf.get(inviter) ?? []
      siblings.push(meta.address)
      childrenOf.set(inviter, siblings)

      const from = nodePositions[i]
      let toX = 0
      let toY = 0
      let toZ = 0
      if (inviter !== 'Armada') {
        const parentIdx = indexByAddress.get(inviter)
        if (parentIdx == null) continue
        const parent = nodePositions[parentIdx]
        toX = parent.x
        toY = parent.y
        toZ = parent.z
      }
      edgePositions.push(from.x, from.y, from.z, toX, toY, toZ)
      edgePairs.push([meta.address, inviter])
    }

    // Walk ancestors + descendants for selection-time lineage highlighting.
    const computeLineage = (addr: string): Set<string> => {
      const set = new Set<string>()
      set.add(addr)
      // Ancestors up to (and including) Armada.
      let cur: string | undefined = addr
      while (cur) {
        const p = parentOf.get(cur)
        if (!p) break
        set.add(p)
        if (p === 'Armada') break
        cur = p
      }
      // Descendants via BFS.
      const queue: string[] = [addr]
      while (queue.length) {
        const n = queue.shift() as string
        const kids = childrenOf.get(n)
        if (!kids) continue
        for (const k of kids) {
          if (!set.has(k)) {
            set.add(k)
            queue.push(k)
          }
        }
      }
      return set
    }

    // Edges are split across two LineSegments objects so they can have
    // independent material opacities: a "background" set for non-tree edges
    // and a "tree" set for edges on the selected lineage path. At idle, all
    // edges live in the background object.
    const allEdgePositions = new Float32Array(edgePositions)

    const bgEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xc491e5,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
    const treeEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffe4a3,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })

    const bgEdgeGeometry = new THREE.BufferGeometry()
    bgEdgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(allEdgePositions.slice(), 3),
    )
    const bgEdges = new THREE.LineSegments(bgEdgeGeometry, bgEdgeMaterial)
    focus.add(bgEdges)

    const treeEdgeGeometry = new THREE.BufferGeometry()
    treeEdgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    const treeEdges = new THREE.LineSegments(treeEdgeGeometry, treeEdgeMaterial)
    focus.add(treeEdges)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: THREE.Mesh | null = null
    let dragLastX = 0
    let dragLastY = 0
    let pointerDownX = 0
    let pointerDownY = 0
    // Squared distance threshold (px²) used to tell a click from a drag.
    const CLICK_DRAG_THRESHOLD_SQ = 25

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
      pointerDownX = e.clientX
      pointerDownY = e.clientY
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

      // If the pointer moved more than the click/drag threshold between down
      // and up, treat the gesture as a drag and leave selection unchanged.
      const dx = e.clientX - pointerDownX
      const dy = e.clientY - pointerDownY
      if (dx * dx + dy * dy > CLICK_DRAG_THRESHOLD_SQ) return

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

    let lastHighlightedAddress: string | null = null

    // Cached lineage set for the current selection. Read by the per-frame node
    // loop to dim non-lineage nodes; written by updateEdgeHighlight when the
    // selection changes.
    let currentLineage: Set<string> | null = null

    // Opacity targets for the two edge materials in the two states.
    const BG_OPACITY_IDLE = 0.3
    const BG_OPACITY_DIMMED = 0.08
    const TREE_OPACITY = 0.7

    const updateEdgeHighlight = (addr: string | null) => {
      if (addr === lastHighlightedAddress) return
      lastHighlightedAddress = addr

      if (!addr) {
        currentLineage = null
        // Restore: all edges in the background pass at full default opacity,
        // tree pass empty.
        bgEdgeGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(allEdgePositions.slice(), 3),
        )
        treeEdgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
        bgEdgeMaterial.opacity = BG_OPACITY_IDLE
        return
      }

      currentLineage = computeLineage(addr)

      // Partition every edge by whether both endpoints are inside the lineage
      // (treating 'Armada' as always in, so the edges to the center stay tree).
      const treePos: number[] = []
      const bgPos: number[] = []
      for (let s = 0; s < edgePairs.length; s += 1) {
        const [a, b] = edgePairs[s]
        const aIn = a === 'Armada' || currentLineage.has(a)
        const bIn = b === 'Armada' || currentLineage.has(b)
        const base = s * 6
        if (aIn && bIn) {
          for (let k = 0; k < 6; k += 1) treePos.push(allEdgePositions[base + k])
        } else {
          for (let k = 0; k < 6; k += 1) bgPos.push(allEdgePositions[base + k])
        }
      }
      bgEdgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bgPos, 3))
      treeEdgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(treePos, 3))
      bgEdgeMaterial.opacity = BG_OPACITY_DIMMED
      treeEdgeMaterial.opacity = TREE_OPACITY
    }

    const animate = () => {
      const selectedAddr = highlightRef.current
      updateEdgeHighlight(selectedAddr ?? null)

      const shouldAutoRotate = !selectedAddr && !hoverActiveRef.current && !isDraggingRef.current
      if (shouldAutoRotate) {
        root.rotation.y += 0.001
        root.rotation.x += 0.0003
      }

      // Subtle emphasis on hovered node; lineage-aware dimming when selected.
      for (let i = 0; i < nodeMeshes.length; i += 1) {
        const m = nodeMeshes[i]
        const isHovered = hovered === m
        const meta = m.userData as NodeMeta
        const isSelected = !!selectedAddr && meta.address === selectedAddr
        const activeFilter = filterRef.current
        const isFilteredOut =
          !!activeFilter &&
          (activeFilter === 'Multi-hop' ? !meta.multiHop : meta.kind !== activeFilter)
        const isOutsideLineage = !!currentLineage && !currentLineage.has(meta.address)
        const isDimmed = isFilteredOut || (isOutsideLineage && !isSelected)
        const target = Math.max(isHovered ? 1.35 : 1, isSelected ? 1.55 : 1)
        const s = m.scale.x + (target - m.scale.x) * 0.15
        m.scale.setScalar(s)

        const mat = m.material as THREE.MeshBasicMaterial
        const base = meta.ghost ? 0.12 : 0.6
        const targetOpacity = isSelected ? 1 : isDimmed ? (meta.ghost ? 0.06 : 0.08) : base
        mat.opacity = mat.opacity + (targetOpacity - mat.opacity) * 0.12

        const haloMat = haloMaterials[i]
        if (haloMat) {
          const haloTarget = isSelected ? 1 : isDimmed ? 0.08 : 1
          haloMat.opacity = haloMat.opacity + (haloTarget - haloMat.opacity) * 0.12
        }
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
      bgEdgeGeometry.dispose()
      treeEdgeGeometry.dispose()
      bgEdgeMaterial.dispose()
      treeEdgeMaterial.dispose()
      centerBgTexture.dispose()
      centerMat.dispose()
      multiHopRingMaterialTemplate.dispose()
      for (const mat of haloMaterials) {
        if (mat) mat.dispose()
      }
      multiHopRingTexture.dispose()

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
      {/* Hover tooltip — display disabled; kept for possible reinstatement. */}
      {SHOW_HOVER_POPUP && hover && hover.visible && (
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
      {selectedTip?.visible && (
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

