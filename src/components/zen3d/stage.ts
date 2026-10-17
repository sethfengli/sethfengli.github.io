import type * as THREE from 'three'

/**
 * ZenStage：Three.js 场景基础设施（v2）
 * - 轨道式鼠标操控（Pointer Events 拖拽旋转 / 滚轮缩放 / 双指捏合），带阻尼与空闲自动旋转；
 * - 点击拾取（按下/松开位移 < 8px 视为点击），支持按组拾取；
 * - 柔和阴影：软阴影贴图 + 物体接地阴影（catch shadow），场景更有“重量感”；
 * - 可见性暂停（IntersectionObserver + visibilitychange），离屏不计帧；
 * - 自适应像素比（DPR 上限 2，低功耗设备降到 1.25）；
 * - respects prefers-reduced-motion：关闭自动旋转与持续动画；
 * - 通过参数注入 three 模块，保持 three 代码可被动态 import 按需加载。
 */

export interface StageOpts {
  distance?: number
  minDistance?: number
  maxDistance?: number
  /** 初始方位角 / 极角（弧度） */
  theta?: number
  phi?: number
  minPhi?: number
  maxPhi?: number
  /** 观察目标的高度偏移（场景整体重心不在 y=0 时用，避免主体偏出画面） */
  targetY?: number
  /** 空闲自动旋转速度（rad/s） */
  autoRotate?: number
  /** 场景背景色（雾色，默认透明）——设了才加雾 */
  fogColor?: number
  /** 雾密度（FogExp2，≈0.005 淡 / 0.03 浓） */
  fogDensity?: number
  /** 主光强度 */
  lightIntensity?: number
  /** 主光方位（默认右上前方；钟 / 树各自换一边，形体才不被正面光拍平） */
  lightPosition?: [number, number, number]
  /** 半球环境光强度（调低可增强明暗对比） */
  hemiIntensity?: number
}

export interface Stage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  raycaster: THREE.Raycaster
  /** 用户是否偏好减少动效 */
  reducedMotion: boolean
  /** 注册点击拾取：命中 clickables 中任一对象时回调 */
  setPick: (objects: () => THREE.Object3D[], cb: (obj: THREE.Object3D | null) => void) => void
  /** 每帧回调（dt 秒, 总时长秒） */
  onFrame: (cb: (dt: number, t: number) => void) => void
  /** 在 y 平面上放置一个软接地阴影（对象与地面之间的“重量感”） */
  addCatchShadow: (opts?: {
    radius?: number
    y?: number
    opacity?: number
    color?: number
    follow?: () => THREE.Vector3
  }) => THREE.Mesh
  /** 宣纸上的淡墨地台：径向渐隐，没有硬边（取代以前那圈「灰盘子」） */
  addInkGround: (opts?: { radius?: number; y?: number; opacity?: number; color?: number }) => THREE.Mesh
  dispose: () => void
}

/** 低功耗推断：省电/低内存设备降低渲染代价 */
function isLowPowerDevice(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
    if (nav.deviceMemory && nav.deviceMemory <= 4) return true
    if (nav.connection?.saveData) return true
  } catch {
    /* 忽略 */
  }
  return false
}

export function createStage(
  THREEmod: typeof THREE,
  canvas: HTMLCanvasElement,
  opts: StageOpts = {},
): Stage {
  const THREE = THREEmod

  let antialias = true
  if (isLowPowerDevice()) antialias = false
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' })
  const dprCap = isLowPowerDevice() ? 1.25 : 2
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.06

  // 柔和阴影贴图（默认开启，组件通过 castShadow 使用；场景小、代价低）
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  // 极简环境贴图：上暖下冷的竖直渐变。金属材质（青铜/黄铜）没有环境反射时
  // 会呈现「一片死黄」，加一层低成本 equirect 渐变就能出现柔和的明暗过渡。
  // （不引入 three/examples 的 RoomEnvironment —— 那会把 examples 拖进 chunk）
  const envCanvas = document.createElement('canvas')
  envCanvas.width = 256
  envCanvas.height = 128
  const envCtx = envCanvas.getContext('2d')!
  const envGrad = envCtx.createLinearGradient(0, 0, 0, 128)
  envGrad.addColorStop(0, '#fbf6e9')
  envGrad.addColorStop(0.45, '#e9eee9')
  envGrad.addColorStop(0.75, '#b9c8c0')
  envGrad.addColorStop(1, '#6f8478')
  envCtx.fillStyle = envGrad
  envCtx.fillRect(0, 0, 256, 128)
  // 左上暖光斑：让金属高光有方向感
  const envSpot = envCtx.createRadialGradient(64, 30, 2, 64, 30, 60)
  envSpot.addColorStop(0, 'rgba(255,248,225,0.95)')
  envSpot.addColorStop(1, 'rgba(255,248,225,0)')
  envCtx.fillStyle = envSpot
  envCtx.fillRect(0, 0, 256, 128)
  const envTex = new THREE.CanvasTexture(envCanvas)
  envTex.mapping = THREE.EquirectangularReflectionMapping
  envTex.colorSpace = THREE.SRGBColorSpace
  scene.environment = envTex
  scene.environmentIntensity = 0.65
  if (opts.fogColor != null) {
    scene.fog = new THREE.FogExp2(opts.fogColor, opts.fogDensity ?? 0.008)
  }
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300)
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()

  // 灯光：半球环境 + 全场景太阳（投影）+ 暖色补光
  scene.add(new THREE.HemisphereLight(0xf3f9fb, 0x2d4a3e, opts.hemiIntensity ?? 1.15))
  const sun = new THREE.DirectionalLight(0xfff3dd, opts.lightIntensity ?? 2.0)
  sun.position.set(...(opts.lightPosition ?? [6, 10, 7]))
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 40
  sun.shadow.camera.left = -14
  sun.shadow.camera.right = 14
  sun.shadow.camera.top = 14
  sun.shadow.camera.bottom = -14
  sun.shadow.bias = -0.0015
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  const warm = new THREE.PointLight(0xffd9a0, 16, 40, 1.8)
  warm.position.set(-4, 3, 4)
  scene.add(warm)
  // 冷色轮廓光：从背左打来，把主体边缘从浅色纸面上「剥」出来
  const rim = new THREE.DirectionalLight(0xc9dcd6, 0.55)
  rim.position.set(-7, 6, -9)
  scene.add(rim)

  // 轨道状态（带阻尼）
  const targetY = opts.targetY ?? 0
  const cur = {
    theta: opts.theta ?? 0.45,
    phi: opts.phi ?? 1.12,
    radius: opts.distance ?? 16,
  }
  const tgt = { ...cur }
  const minR = opts.minDistance ?? 6
  const maxR = opts.maxDistance ?? 40
  const minPhi = opts.minPhi ?? 0.35
  const maxPhi = opts.maxPhi ?? 1.72
  let autoRotate = opts.autoRotate ?? 0

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const reducedMotion = media.matches

  // 交互
  let dragging = false
  let lastX = 0
  let lastY = 0
  let lastT = 0
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDist = 0
  let downX = 0
  let downY = 0

  const rect = () => canvas.getBoundingClientRect()

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 1) {
      dragging = true
      downX = e.clientX
      downY = e.clientY
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    }
    lastX = e.clientX
    lastY = e.clientY
    lastT = performance.now()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastT) / 1000)
    lastT = now

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDist > 0) tgt.radius = THREE.MathUtils.clamp(tgt.radius * (pinchDist / d), minR, maxR)
      pinchDist = d
      return
    }
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    const w = Math.max(300, rect().width)
    tgt.theta -= (dx / w) * Math.PI * 1.6
    tgt.phi = THREE.MathUtils.clamp(tgt.phi - (dy / w) * Math.PI * 1.6, minPhi, maxPhi)
    void dt
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerUp = (e: PointerEvent) => {
    const wasDragging = dragging
    pointers.delete(e.pointerId)
    if (pointers.size === 0) dragging = false

    // 点击拾取
    if (!wasDragging) return
    const dx = e.clientX - downX
    const dy = e.clientY - downY
    if (Math.hypot(dx, dy) < 8 && pickRef.current) {
      const r = rect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      // 命中判定放宽 8%，小零件也容易点中
      const hits = raycaster.intersectObjects(pickRef.current.objects(), false)
      const targets = hits.length ? hits : raycaster.intersectObjects(pickRef.current.objects(), true)
      pickRef.current.cb(targets.length ? targets[0].object : null)
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    tgt.radius = THREE.MathUtils.clamp(tgt.radius * (1 + e.deltaY * 0.0012), minR, maxR)
  }

  canvas.style.touchAction = 'none'
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  // 鼠标移出画布时结束拖拽，避免“丢指针”
  const onPointerLeave = () => {
    if (pointers.size > 0 && !canvas.hasPointerCapture([...pointers.keys()][0])) return
    dragging = false
    pointers.clear()
  }
  canvas.addEventListener('pointerleave', onPointerLeave)

  // 空闲自动旋转
  let idleFor = 0
  let visible = true
  const visObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true
  })
  visObserver.observe(canvas)
  const onVis = () => {
    visible = document.visibilityState === 'visible'
  }
  document.addEventListener('visibilitychange', onVis)

  // 尺寸
  const resize = () => {
    const parent = canvas.parentElement
    if (!parent) return
    const w = Math.max(240, parent.clientWidth)
    const h = Math.max(260, parent.clientHeight || Math.round(w * 0.72))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  if (canvas.parentElement) ro.observe(canvas.parentElement)

  // 帧循环
  const frameCbs: Array<(dt: number, t: number) => void> = []
  let lastNow = performance.now()
  let elapsed = 0
  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastNow) / 1000)
    lastNow = now
    if (!visible) return
    elapsed += dt

    if (!dragging && pointers.size === 0) {
      idleFor += dt
      if (autoRotate && !reducedMotion && idleFor > 1.6) tgt.theta += autoRotate * dt
    } else {
      idleFor = 0
    }

    const k = 1 - Math.pow(0.0018, dt)
    cur.theta += (tgt.theta - cur.theta) * k
    cur.phi += (tgt.phi - cur.phi) * k
    cur.radius += (tgt.radius - cur.radius) * k

    const sp = new THREE.Spherical(cur.radius, cur.phi, cur.theta)
    camera.position.setFromSpherical(sp)
    camera.position.y += targetY
    camera.lookAt(0, targetY, 0)

    for (const cb of frameCbs) cb(dt, elapsed)
    renderer.render(scene, camera)
  })

  const pickRef: {
    current: { objects: () => THREE.Object3D[]; cb: (obj: THREE.Object3D | null) => void } | null
  } = { current: null }

  /** 软接地阴影材质（径向渐变） */
  const shadowTex = (() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 128
    const ctx = cv.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62)
    g.addColorStop(0, 'rgba(20,30,26,0.42)')
    g.addColorStop(0.55, 'rgba(20,30,26,0.16)')
    g.addColorStop(1, 'rgba(20,30,26,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(cv)
    return tex
  })()

  /** 宣纸淡墨地台纹理（径向渐隐 + 少许墨点飞白） */
  let inkTex: THREE.CanvasTexture | null = null
  const getInkTex = () => {
    if (inkTex) return inkTex
    const cv = document.createElement('canvas')
    cv.width = 512
    cv.height = 512
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, 512, 512)
    const g = ctx.createRadialGradient(256, 256, 24, 256, 256, 252)
    g.addColorStop(0, 'rgba(52,68,60,0.3)')
    g.addColorStop(0.5, 'rgba(52,68,60,0.16)')
    g.addColorStop(0.82, 'rgba(52,68,60,0.05)')
    g.addColorStop(1, 'rgba(52,68,60,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(256, 256, 252, 0, Math.PI * 2)
    ctx.fill()
    // 边缘飞白：几十枚极淡的墨点，打散「完美圆形」的机械感
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 150 + Math.random() * 100
      const rr = 2 + Math.random() * 14
      ctx.fillStyle = `rgba(52,68,60,${0.01 + Math.random() * 0.03})`
      ctx.beginPath()
      ctx.ellipse(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, rr, rr * 0.55, a, 0, Math.PI * 2)
      ctx.fill()
    }
    inkTex = new THREE.CanvasTexture(cv)
    return inkTex
  }

  return {
    scene,
    camera,
    renderer,
    raycaster,
    reducedMotion,
    setPick(objects, cb) {
      pickRef.current = { objects, cb }
    },
    onFrame(cb) {
      frameCbs.push(cb)
    },
    addCatchShadow({ radius = 4.2, y = -4.3, opacity = 0.55, color = 0x000000, follow } = {}) {
      const mat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity,
        color,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(0, y, 0)
      mesh.renderOrder = 1
      scene.add(mesh)
      if (follow) {
        frameCbs.push(() => {
          const v = follow()
          mesh.position.x = v.x
          mesh.position.z = v.z
        })
      }
      return mesh
    },
    addInkGround({ radius = 12, y = -4.4, opacity = 1, color = 0xffffff } = {}) {
      const mat = new THREE.MeshBasicMaterial({
        map: getInkTex(),
        transparent: true,
        opacity,
        color,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = y
      mesh.renderOrder = 0
      scene.add(mesh)
      return mesh
    },
    dispose() {
      renderer.setAnimationLoop(null)
      visObserver.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      shadowTex.dispose()
      inkTex?.dispose()
      envTex.dispose()
      renderer.dispose()
    },
  }
}

/** 画布纹理：竖排文字（用于“嗡”字、飘带等） */
export function makeTextCanvas(
  text: string,
  opts: { w?: number; h?: number; fontSize?: number; color?: string; font?: string; vertical?: boolean } = {},
): HTMLCanvasElement {
  const w = opts.w ?? 256
  const h = opts.h ?? 256
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.font = `${opts.fontSize ?? 96}px ${opts.font ?? '"MaShanZhengSubset","MaShanZhengSubset","KaiTi","KaiTi",cursive'}`
  ctx.fillStyle = opts.color ?? '#f3f0e6'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (opts.vertical) {
    const n = Math.min(text.length, 8)
    const fs = (opts.fontSize ?? 96) * 0.72
    ctx.font = `${fs}px ${opts.font ?? '"MaShanZhengSubset","KaiTi","KaiTi",cursive'}`
    const lineH = fs * 1.15
    const startY = h / 2 - ((n - 1) * lineH) / 2
    for (let i = 0; i < n; i++) ctx.fillText(text[i], w / 2, startY + i * lineH)
  } else {
    ctx.fillText(text, w / 2, h / 2)
  }
  return cv
}

/** 红色飘带纹理（竖排心愿文字） */
export function makeRibbonTexture(
  THREEmod: typeof THREE,
  text: string,
  shade: number,
): THREE.CanvasTexture {
  const w = 192
  const h = 640
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  const grads = ['#c2543c', '#cf6a52', '#ab4330']
  const dark = ['#8e2e22', '#a13728', '#7d241b']
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, dark[shade % 3])
  g.addColorStop(0.5, grads[shade % 3])
  g.addColorStop(1, dark[shade % 3])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // 燕尾
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(w, h)
  ctx.lineTo(w / 2, h - 44)
  ctx.closePath()
  ctx.fill()
  // 金边
  ctx.strokeStyle = 'rgba(239,212,100,0.9)'
  ctx.lineWidth = 5
  ctx.strokeRect(3, 3, w - 6, h - 50)
  // 竖排文字
  const n = Math.min(text.length, 10)
  ctx.font = '50px "MaShanZhengSubset","KaiTi","KaiTi",cursive'
  ctx.fillStyle = '#fdf3e7'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineH = 52
  const startY = 90 + Math.max(0, (400 - n * lineH) / 2)
  for (let i = 0; i < n; i++) ctx.fillText(text[i], w / 2, startY + i * lineH)
  const tex = new THREEmod.CanvasTexture(cv)
  tex.colorSpace = THREEmod.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
