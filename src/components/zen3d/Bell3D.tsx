import { useEffect, useRef, useState, type ReactNode } from 'react'
import type * as THREE from 'three'
import { useI18n } from '../../i18n'
import { useBellSound } from '../../lib/bellSound'
import { createStage, makeTextCanvas, type Stage } from './stage'

/**
 * 3D 梵钟（v3 · 第 11 轮重制）
 *
 * 上一版被用户判为「造型太丑」，实测截图的症结是：
 *   ① 钟身近圆柱、上下各箍两道**亮金色环**，远看像一只鎏金灯笼；
 *   ② 木架只有两根细柱 + 一根横梁，柱与梁不相接，梁端两枚金色圆球像玩具；
 *   ③ 撞木悬在半空、绳索与梁断开，看不出「吊着」；
 *   ④ 构图偏小且贴边，钟口敞开处只剩一圈金环。
 *
 * 本版重做：
 *   - 钟形按真实梵钟剖面重建：窄冠、溜肩、直腹微收、**外撇钟唇**；
 *     外层 / 内层双壳 + 钟唇环，能看见钟内暗面（不再是实心桶）；
 *   - 材质改为**旧青铜**（哑光、低金属度 + 铜绿斑），金色只用于阴刻铭文与极细弦线；
 *   - 木架改成有收分的方形立柱 + 厚横梁 + 铁箍，**钟以链环吊在梁下**；
 *   - 撞木改成**双绳吊在梁下的横木**，击钟时绕吊点摆向钟身（力学上说得通）；
 *   - 石台 + 淡墨地台 + 接地软阴影，替代漂浮感；
 *   - 击钟特效从「金环套钟」改为**地面声波涟漪** + 暖光 + 「嗡」字上浮。
 *
 * 交互不变：拖拽旋转 / 滚轮缩放 / 点铜钟或撞木（或下方按钮）击钟。
 * 起始即全景（distance=21）；WebGL 不可用时回退 2D SVG 铜钟。
 */

interface BellRig {
  bellPivot: THREE.Group
  strikeRequested: boolean
  strikeT: number
  rings: Array<{ mesh: THREE.Mesh; born: number }>
  oms: Array<{ sprite: THREE.Sprite; born: number }>
  flash: THREE.PointLight
}

/**
 * 钟身外轮廓（半径, 高度）：自上而下。
 * 关键在「肩要收得住」——冠部 r1.15 快速放到 r2.6，然后近乎直腹走到钟唇 r3.56。
 * 上一版肩部鼓得太圆，侧影像一只矮桶。
 */
const OUTER: Array<[number, number]> = [
  [1.15, 3.3],
  [1.6, 3.22],
  [2.0, 3.05],
  [2.3, 2.8],
  [2.48, 2.5],
  [2.58, 2.15],
  [2.63, 1.75],
  [2.66, 1.3],
  [2.69, 0.8],
  [2.73, 0.2],
  [2.78, -0.5],
  [2.85, -1.2],
  [2.94, -1.9],
  [3.06, -2.55],
  [3.2, -3.1],
  [3.38, -3.55],
  [3.5, -3.72],
  [3.56, -3.78],
]

/** 内壁（比外壁略收，底沿与钟唇环相接） */
const INNER_SCALE = 0.955
const BELL_MOUTH_Y = -3.78

/**
 * 身高 / 腹径比：真实梵钟是「高钟」，不是「矮钟」。
 * 剖面按 r≈3.56、h≈7.1 画（1:1 的矮胖比例，上一版看着像蒸笼），
 * 这里统一拉伸 1.3 倍、收窄 0.9 倍 → 高 9.2 / 径 6.4（≈1.45:1），侧影立刻挺拔。
 */
const BELL_SY = 1.3
const BELL_SXZ = 0.9
/** 摆动枢轴 = 龙钮环中心（世界坐标；钟身高 9.2，冠钮在 5 米处） */
const BELL_PIVOT_Y = 5.05

/** 高度 → 外半径（线性插值；用于把弦线 / 乳钉贴在钟面上） */
function radiusAt(y: number): number {
  for (let i = 0; i < OUTER.length - 1; i++) {
    const [r0, y0] = OUTER[i]
    const [r1, y1] = OUTER[i + 1]
    if (y <= y0 && y >= y1) {
      const k = (y - y0) / (y1 - y0)
      return r0 + (r1 - r0) * k
    }
  }
  return y > OUTER[0][1] ? OUTER[0][0] : OUTER[OUTER.length - 1][0]
}

/** 旧青铜：哑光铜底 + 铜绿斑 + 铸痕（不再用亮金渐变） */
function makeBronzeMap(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 1024
  cv.height = 512
  const ctx = cv.getContext('2d')!
  // 底色：整片旧铜，**不要横向渐变** —— 渐变绕一圈会在钟面形成竖条纹，
  // 上一版看起来像木纹金属桶，就是这个原因。
  ctx.fillStyle = '#4b4335'
  ctx.fillRect(0, 0, 1024, 512)
  // 大块云状色斑：暖铜 / 暗铜交替，模拟氧化不均
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 1024
    const y = Math.random() * 512
    const r = 90 + Math.random() * 190
    const warm = Math.random() > 0.5
    const rg = ctx.createRadialGradient(x, y, 2, x, y, r)
    rg.addColorStop(0, warm ? 'rgba(108,92,64,0.22)' : 'rgba(42,36,27,0.26)')
    rg.addColorStop(1, 'rgba(90,76,58,0)')
    ctx.fillStyle = rg
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 竖向铸痕（钟为合范铸造，范缝是竖的）
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * 1024
    ctx.strokeStyle = `rgba(48,40,30,${0.05 + Math.random() * 0.1})`
    ctx.lineWidth = 1 + Math.random() * 2.4
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 32) ctx.lineTo(x + Math.sin(y * 0.02 + i) * 3, y)
    ctx.stroke()
  }
  // 铜绿包浆：偏灰绿，低透明度，成片而非星点
  for (let i = 0; i < 44; i++) {
    ctx.fillStyle = `rgba(104,132,116,${0.035 + Math.random() * 0.09})`
    ctx.beginPath()
    ctx.ellipse(
      Math.random() * 1024,
      Math.random() * 512,
      30 + Math.random() * 110,
      16 + Math.random() * 60,
      Math.random() * 3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  // 高光擦痕
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(206,186,148,${0.03 + Math.random() * 0.06})`
    ctx.lineWidth = 1
    ctx.beginPath()
    const x = Math.random() * 1024
    const y = Math.random() * 512
    ctx.moveTo(x, y)
    ctx.lineTo(x + 10 + Math.random() * 40, y + (Math.random() - 0.5) * 6)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

/** 木纹：深胡桃木底 + 顺纹直丝 */
function makeWoodMap(THREE: typeof import('three')): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#403327'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256
    ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '28,21,15' : '112,90,64'},${0.07 + Math.random() * 0.16})`
    ctx.lineWidth = 0.6 + Math.random() * 2.2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    for (let y = 0; y <= 256; y += 16) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 3, y)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  return tex
}

/** 铭文板：两列两行（右上起读）+ 落款细线（阴刻感：铜面上直接亮字，不贴黑牌） */
function makeInscription(THREE: typeof import('three'), text: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 256
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)
  ctx.fillStyle = '#d8ba74'
  ctx.font = 'bold 94px "MaShanZhengSubset","KaiTi","SimSun",serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(18,14,9,0.65)'
  ctx.shadowBlur = 6
  const cols = [170, 86]
  for (let i = 0; i < Math.min(text.length, 4); i++) {
    const cx = cols[Math.floor(i / 2)]
    const cy = 82 + (i % 2) * 95
    ctx.fillText(text[i], cx, cy)
  }
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(200,168,104,0.28)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(128, 22)
  ctx.lineTo(128, 234)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export interface Props {
  fallback?: ReactNode
}

export function Bell3D({ fallback }: Props) {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const rigRef = useRef<BellRig | null>(null)
  const { ring, onEnded } = useBellSound()
  const [failed, setFailed] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [count, setCount] = useState(0)
  const unlockRef = useRef(0)
  const strikeRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stage: Stage | null = null

    void import('three').then((THREE) => {
      if (disposed || !canvas.isConnected) return
      try {
        stage = createStage(THREE, canvas, {
          distance: 24,
          autoRotate: 0,
          theta: 0.5,
          phi: 1.3,
          targetY: 0.3,
          minPhi: 0.95,
          maxPhi: 1.5,
          minDistance: 9,
          maxDistance: 38,
          lightPosition: [-6, 9, 7],
          hemiIntensity: 0.9,
        })
        stageRef.current = stage
      } catch {
        setFailed(true)
        return
      }
      const S = stage.scene

      /* ---------- 材质 ---------- */
      const bronzeMap = makeBronzeMap(THREE)
      const woodMap = makeWoodMap(THREE)
      const bronze = new THREE.MeshStandardMaterial({
        map: bronzeMap,
        metalness: 0.4,
        roughness: 0.52,
        bumpMap: bronzeMap,
        bumpScale: 0.08,
        envMapIntensity: 0.8,
        side: THREE.DoubleSide,
      })
      const bronzeDark = new THREE.MeshStandardMaterial({
        color: 0x382f25,
        metalness: 0.2,
        roughness: 0.78,
        envMapIntensity: 0.35,
        side: THREE.BackSide,
      })
      const bronzeLight = new THREE.MeshStandardMaterial({
        color: 0x877a62,
        metalness: 0.45,
        roughness: 0.48,
        envMapIntensity: 0.6,
      })
      const brass = new THREE.MeshStandardMaterial({
        color: 0xa88c58,
        metalness: 0.65,
        roughness: 0.42,
        envMapIntensity: 0.7,
      })
      const wood = new THREE.MeshStandardMaterial({
        map: woodMap,
        color: 0xffffff,
        roughness: 0.82,
        metalness: 0.02,
      })
      const iron = new THREE.MeshStandardMaterial({ color: 0x2f2b25, roughness: 0.68, metalness: 0.4 })

      /* ---------- 地台：淡墨地台 + 软阴影（不再用一圈灰白圆盘压住画面） ---------- */
      stage.addInkGround({ radius: 16, y: -5.3, opacity: 0.95 })
      stage.addCatchShadow({ radius: 7.6, y: -5.28, opacity: 0.34 })
      stage.addCatchShadow({ radius: 3.3, y: -5.27, opacity: 0.5 })

      /* ---------- 木架：收分方柱 + 厚横梁 + 铁箍 ---------- */
      const postGeo = new THREE.CylinderGeometry(0.5, 0.68, 11.7, 4)
      postGeo.rotateY(Math.PI / 4)
      for (const x of [-4.8, 4.8]) {
        const post = new THREE.Mesh(postGeo, wood)
        post.position.set(x, 0.6, 0)
        post.castShadow = true
        post.receiveShadow = true
        S.add(post)
        // 柱脚石
        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(1.7, 0.36, 1.7),
          new THREE.MeshStandardMaterial({ color: 0x8a968d, roughness: 1 }),
        )
        foot.position.set(x, -5.08, 0)
        foot.castShadow = true
        S.add(foot)
        // 铁箍两道
        for (const y of [4.6, 0.0]) {
          const strap = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.14, 1.24), iron)
          strap.position.set(x, y, 0)
          S.add(strap)
        }
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.8, 0.78), wood)
      beam.position.set(0, 6.25, 0)
      beam.castShadow = true
      beam.receiveShadow = true
      S.add(beam)
      // 梁面匾额：一行「慧燈禪院」，让横梁不再是一条空木方
      const plaqueCv = document.createElement('canvas')
      plaqueCv.width = 1024
      plaqueCv.height = 208
      const pctx = plaqueCv.getContext('2d')!
      pctx.fillStyle = '#33271b'
      pctx.fillRect(0, 0, 1024, 208)
      pctx.strokeStyle = '#b08a4a'
      pctx.lineWidth = 6
      pctx.strokeRect(14, 14, 996, 180)
      pctx.fillStyle = '#d8ba74'
      pctx.font = 'bold 148px "MaShanZhengSubset","KaiTi","SimSun",serif'
      pctx.textAlign = 'center'
      pctx.textBaseline = 'middle'
      pctx.fillText('慧燈禪院', 512, 108)
      const plaqueTex = new THREE.CanvasTexture(plaqueCv)
      plaqueTex.colorSpace = THREE.SRGBColorSpace
      plaqueTex.anisotropy = 4
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(4.0, 0.7),
        new THREE.MeshBasicMaterial({ map: plaqueTex, toneMapped: false }),
      )
      plaque.position.set(0, 6.25, 0.4)
      S.add(plaque)
      // 梁头铁件（收口）
      for (const x of [-5.0, 5.0]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.84, 0.82), iron)
        cap.position.set(x, 6.25, 0)
        S.add(cap)
      }
      // 梁下雀替：两枚小斜撑，撑住横梁（中国木构的收头语汇）
      for (const s of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.46), wood)
        brace.position.set(s * 4.4, 5.65, 0)
        brace.rotation.z = s * -0.55
        brace.castShadow = true
        S.add(brace)
      }

      /* ---------- 钟身（双壳 + 钟唇） ---------- */
      const bell = new THREE.Group()
      bell.scale.set(BELL_SXZ, BELL_SY, BELL_SXZ)
      const outerGeo = new THREE.LatheGeometry(
        OUTER.map(([x, y]) => new THREE.Vector2(x, y)),
        96,
      )
      const outer = new THREE.Mesh(outerGeo, bronze)
      outer.castShadow = true
      outer.receiveShadow = true
      bell.add(outer)
      const innerGeo = new THREE.LatheGeometry(
        OUTER.map(([x, y]) => new THREE.Vector2(x, y)),
        96,
      )
      const inner = new THREE.Mesh(innerGeo, bronzeDark)
      inner.scale.set(INNER_SCALE, 1, INNER_SCALE)
      inner.position.y = 0.02
      bell.add(inner)
      // 钟唇：一圈厚铜环，压住内外壳的开口
      const lip = new THREE.Mesh(new THREE.TorusGeometry(3.46, 0.13, 12, 96), bronzeLight)
      lip.rotation.x = Math.PI / 2
      lip.position.y = BELL_MOUTH_Y + 0.005
      bell.add(lip)

      /* ---------- 弦线三道（细金线，不是粗金箍） ---------- */
      for (const y of [2.0, -0.2, -2.5]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(y) + 0.012, 0.024, 8, 96), brass)
        band.rotation.x = Math.PI / 2
        band.position.y = y
        bell.add(band)
      }

      /* ---------- 乳钉两排（梵钟「乳の紋」） ---------- */
      const nippleGeo = new THREE.SphereGeometry(0.085, 10, 8)
      for (const [row, y] of [1.35, 0.6].entries()) {
        const r = radiusAt(y)
        const count = 22
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + row * 0.14
          const n = new THREE.Mesh(nippleGeo, bronzeLight)
          n.position.set(Math.cos(a) * (r + 0.04), y, Math.sin(a) * (r + 0.04))
          n.scale.set(1, 1, 1.45)
          n.lookAt(new THREE.Vector3(0, y, 0))
          bell.add(n)
        }
      }

      /* ---------- 铭文板（前后各一） ---------- */
      const makePanel = (text: string, thetaStart: number) => {
        // 钟身是外撇的锥面：铭文板必须做成同锥度的圆台，
        // 否则下半段会沉进越来越粗的钟壁里（上一版下半行字只剩半截）。
        const top = -1.35 + 1.1
        const bottom = -1.35 - 1.1
        const rTop = radiusAt(top) + 0.03
        const rBottom = radiusAt(bottom) + 0.03
        const geo = new THREE.CylinderGeometry(rTop, rBottom, 2.2, 28, 1, true, thetaStart, 0.92)
        const tex = makeInscription(THREE, text)
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        })
        const panel = new THREE.Mesh(geo, mat)
        panel.position.y = -1.35
        panel.renderOrder = 2
        return panel
      }
      bell.add(makePanel('風調雨順', -0.46))
      bell.add(makePanel('國泰民安', Math.PI - 0.46))

      /* ---------- 吊点：钟冠环 ---------- */
      const bellPivot = new THREE.Group()
      bellPivot.position.y = BELL_PIVOT_Y
      bell.position.y = -BELL_PIVOT_Y
      bellPivot.add(bell)
      S.add(bellPivot)

      /* ---------- 钟冠（挂在 bellPivot 下的等比空间，不随钟身拉伸） ----------
         莲座 + 龙钮。放在等比空间里，莲瓣与圆环才不会被 1.3 的纵向拉伸变形。 */
      const crown = new THREE.Group()
      const crownSeat = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.28, 0.18, 32), bronzeLight)
      crownSeat.position.y = -0.82
      crown.add(crownSeat)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bronzeLight)
        petal.scale.set(1.5, 0.55, 0.85)
        petal.position.set(Math.cos(a) * 0.98, -0.72, Math.sin(a) * 0.98)
        petal.lookAt(new THREE.Vector3(Math.cos(a) * 3, -0.8, Math.sin(a) * 3))
        crown.add(petal)
      }
      const crownDome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), bronzeLight)
      crownDome.scale.set(1, 0.5, 1)
      crownDome.position.y = -0.68
      crown.add(crownDome)
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.56, 0.42, 20), bronzeLight)
      neck.position.y = -0.38
      crown.add(neck)
      const crownLoop = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.12, 14, 40), bronzeLight)
      crownLoop.position.y = 0
      crown.add(crownLoop)
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.38, 10), brass)
        horn.position.set(s * 0.44, 0.3, 0)
        horn.rotation.z = s * -0.5
        crown.add(horn)
      }
      const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.06, 12, 32), brass)
      crownRing.position.y = 0.54
      crown.add(crownRing)
      bellPivot.add(crown)

      /* ---------- 撞座（撞击点）：钟身右侧一枚凸起的铜座 ----------
         挂在 bellPivot 而不是 bell 下：bell 被非等比缩放（0.9/1.3），
         圆座会被拉成椭圆；beltPivot 是等比空间，且照样随钟摆一起晃。 */
      const bossR = radiusAt(-1.0) * BELL_SXZ
      const bossY = -BELL_PIVOT_Y + -1.0 * BELL_SY
      const strikeBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.64, 0.2, 28), bronzeLight)
      strikeBoss.rotation.z = Math.PI / 2
      strikeBoss.position.set(bossR + 0.11, bossY, 0)
      strikeBoss.castShadow = true
      bellPivot.add(strikeBoss)
      const strikeRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 10, 36), brass)
      strikeRing.rotation.y = Math.PI / 2
      strikeRing.position.set(bossR + 0.22, bossY, 0)
      bellPivot.add(strikeRing)

      /* ---------- 吊链：梁下铁钩 + 一环 ---------- */
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 20), iron)
      link.position.y = 5.72
      S.add(link)
      const staple = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.05, 8, 20), iron)
      staple.position.y = 5.84
      staple.rotation.x = Math.PI / 2
      S.add(staple)

      /* ---------- 击钟特效：地面涟漪 / 暖光 / 嗡 ---------- */
      const ringGeo = new THREE.RingGeometry(0.94, 1.0, 64)
      const flash = new THREE.PointLight(0xffd9a0, 0, 40, 2)
      flash.position.set(0, 1.0, 6.0)
      S.add(flash)

      const rig: BellRig = {
        bellPivot,
        strikeRequested: false,
        strikeT: -1,
        rings: [],
        oms: [],
        flash,
      }
      rigRef.current = rig

      const spawnFx = (t0: number) => {
        rig.strikeT = t0
        rig.flash.intensity = 22
        for (let i = 0; i < 3; i++) {
          const mat = new THREE.MeshBasicMaterial({
            color: 0xc9a75e,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
          const ringMesh = new THREE.Mesh(ringGeo, mat)
          ringMesh.rotation.x = -Math.PI / 2
          ringMesh.position.set(0, -5.26, 0)
          S.add(ringMesh)
          rig.rings.push({ mesh: ringMesh, born: t0 + i * 0.24 })
        }
        const tex = new THREE.CanvasTexture(
          makeTextCanvas('嗡', { w: 256, h: 256, fontSize: 150, color: '#d9b86c' }),
        )
        tex.colorSpace = THREE.SRGBColorSpace
        const omMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
        const sprite = new THREE.Sprite(omMat)
        sprite.scale.set(2.0, 2.0, 1)
        // 放在钟身前方（z=2.4）：钟冠与横梁在同一条 z=0 视线上，
        // 若 sprite 留在 z=0，升起时会被冠钮 / 横梁挡住。
        sprite.position.set(0, 3.4, 2.4)
        S.add(sprite)
        rig.oms.push({ sprite, born: t0 })
      }

      /* ---------- 拾取：点钟即撞 ---------- */
      stage.setPick(
        () => [bell],
        () => strikeRef.current(),
      )

      /* ---------- 帧动画 ---------- */
      const stageLocal = stage
      stage.onFrame((dt, t) => {
        if (rig.strikeRequested) {
          rig.strikeRequested = false
          spawnFx(t)
        }
        const idle = stageLocal.reducedMotion ? 0.25 : 1
        // 静止时被风轻轻推着（幅度极小，避免「晃得晕」）
        bellPivot.rotation.z = Math.sin(t * 0.72) * 0.005 * idle
        bellPivot.rotation.x = Math.sin(t * 0.53 + 1.7) * 0.003 * idle

        if (rig.strikeT >= 0) {
          const k = t - rig.strikeT
          // 击钟：钟体绕冠钮挂点摆荡（衰减摆），不再有悬空的撞木
          if (k > 0.04) {
            const kk = k - 0.04
            bellPivot.rotation.z = 0.045 * Math.sin(2.9 * kk) * Math.exp(-0.62 * kk)
            bellPivot.rotation.x = 0.014 * Math.sin(2.2 * kk + 1) * Math.exp(-0.7 * kk)
          }
          if (k > 4.5) rig.strikeT = -1
        }

        for (let i = rig.rings.length - 1; i >= 0; i--) {
          const r = rig.rings[i]
          const k = (t - r.born) / 1.8
          if (k >= 1) {
            S.remove(r.mesh)
            ;(r.mesh.material as THREE.MeshBasicMaterial).dispose()
            rig.rings.splice(i, 1)
            continue
          }
          if (k < 0) continue
          const s = 3.2 + k * 7.5
          r.mesh.scale.set(s, s, 1)
          ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - k)
        }

        for (let i = rig.oms.length - 1; i >= 0; i--) {
          const o = rig.oms[i]
          const k = (t - o.born) / 2.4
          if (k >= 1) {
            S.remove(o.sprite)
            ;(o.sprite.material as THREE.SpriteMaterial).dispose()
            rig.oms.splice(i, 1)
            continue
          }
          o.sprite.position.y = 3.4 + k * 3.2
          const sc = 2.0 * (1 + k * 0.28)
          o.sprite.scale.set(sc, sc, 1)
          ;(o.sprite.material as THREE.SpriteMaterial).opacity =
            k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88
        }

        rig.flash.intensity *= Math.pow(0.0035, dt)
        if (rig.flash.intensity < 0.05) rig.flash.intensity = 0
      })
    })

    return () => {
      disposed = true
      stageRef.current = null
      rigRef.current = null
      stage?.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- 击钟 ---------- */
  const strike = () => {
    if (ringing) return
    setRinging(true)
    setCount((c) => c + 1)
    const rig = rigRef.current
    if (rig) rig.strikeRequested = true
    const unlockMs = ring()
    const un = onEnded(() => {
      window.clearTimeout(unlockRef.current)
      setRinging(false)
    })
    window.clearTimeout(unlockRef.current)
    unlockRef.current = window.setTimeout(() => {
      un()
      setRinging(false)
    }, unlockMs)
  }
  strikeRef.current = strike

  if (failed) return <>{fallback}</>

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative h-[400px] w-full max-w-[620px] sm:h-[460px]">
        <canvas ref={canvasRef} className="h-full w-full" aria-label={t('common.bellAlt')} />
        {ringing && (
          <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 font-song text-lg tracking-[0.3em] text-cinnabar-600">
            {t('dharma.ringing')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={strike}
        disabled={ringing}
        aria-label={t('dharma.ringBell')}
        className={`btn-primary ${ringing ? 'cursor-wait opacity-70' : ''}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15h15L18 12.5V9a6 6 0 0 0-6-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
        {ringing ? t('dharma.ringing') : count > 0 ? t('dharma.ringAgain') : t('dharma.ringBell')}
      </button>
      <div className="text-center font-song text-sm text-ink-500" aria-live="polite">
        {count > 0 ? t('dharma.bellCount', { n: count }) : '\u00a0'}
        <p className="mt-1.5 font-sans text-[11px] text-ink-300">{t('common.bellHint')}</p>
      </div>
    </div>
  )
}
