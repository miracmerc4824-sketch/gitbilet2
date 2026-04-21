/**
 * BusScene.jsx — Gerçekçi Otobüs İç Mekanı
 *
 * Özellikler:
 * - Kamera [0, 1.5, 4.5] — otobüs içi, koridor başı
 * - AmbientLight 0.5 + 5x tavan spotları + güneş şeritleri
 * - ContactShadows — koltuk gölgeleri
 * - RoundedBox koltuklar — MeshStandardMaterial #2a2a2a (kumaş/deri PBR)
 * - OrbitControls: minDistance:1, maxDistance:10, koridor kısıtlı
 * - Auto-scroll dolly — DollyCamera sadece z değiştirir, OrbitControls target'ı takip eder
 * - Yan camlar opacity:0.3 transparan
 */

import { useRef, useState, useMemo, Suspense, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

// ─── Sabitler ────────────────────────────────────────────────────
const ROWS      = 10
const COLS      = 4
const ROW_STEP  = 1.0
const Z_FIRST   = -4.5
const SEAT_DARK = '#2a2a2a'

const STATUS = {
  available: '#00e59b',
  sold:      '#ff4d6d',
  selected:  '#7c6bff',
  female:    '#ff8fc8',
}

const L = THREE.MathUtils.lerp
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// ═══════════════════════════════════════════════════════════════════
// SEAT — RoundedBox PBR kumaş + hover + seçim halkası
// ═══════════════════════════════════════════════════════════════════
function Seat({ position, seatNumber, status, isSelected, onClick, onFocus }) {
  const ref    = useRef()
  const [hov, setHov] = useState(false)
  const canSel = status === 'available' || isSelected

  const accent = isSelected        ? STATUS.selected
    : status === 'sold'            ? STATUS.sold
    : status === 'female'          ? STATUS.female
    : hov && canSel                ? '#a78bff'
    : STATUS.available

  const emI = isSelected ? 0.5 : (hov && canSel) ? 0.25 : 0.0

  useFrame((_, dt) => {
    if (!ref.current) return
    const ts = (hov && canSel) ? 1.07 : 1.0
    ref.current.scale.setScalar(L(ref.current.scale.x, ts, 1 - Math.exp(-16 * dt)))
    if (isSelected) {
      ref.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.015
    } else {
      ref.current.position.y = L(ref.current.position.y, position[1], 1 - Math.exp(-12 * dt))
    }
  })

  const handleClick = useCallback(() => {
    if (!canSel) return
    onClick(seatNumber)
    onFocus(position)
  }, [canSel, onClick, onFocus, seatNumber, position])

  return (
    <group
      ref={ref}
      position={position}
      onClick={handleClick}
      onPointerOver={e => { e.stopPropagation(); setHov(true);  document.body.style.cursor = canSel ? 'pointer' : 'not-allowed' }}
      onPointerOut={e  => { e.stopPropagation(); setHov(false); document.body.style.cursor = 'default' }}
    >
      {/* Oturma minderi */}
      <RoundedBox args={[0.42, 0.10, 0.38]} radius={0.04} smoothness={4}>
        <meshStandardMaterial color={SEAT_DARK} roughness={0.82} metalness={0.03}
          emissive={accent} emissiveIntensity={emI} />
      </RoundedBox>

      {/* Sırt yastığı */}
      <RoundedBox args={[0.42, 0.46, 0.08]} radius={0.04} smoothness={4} position={[0, 0.27, -0.17]}>
        <meshStandardMaterial color={SEAT_DARK} roughness={0.78} metalness={0.03}
          emissive={accent} emissiveIntensity={emI * 0.6} />
      </RoundedBox>

      {/* Kafa yastiği */}
      <RoundedBox args={[0.36, 0.16, 0.09]} radius={0.035} smoothness={4} position={[0, 0.54, -0.165]}>
        <meshStandardMaterial color={SEAT_DARK} roughness={0.80} metalness={0.02}
          emissive={accent} emissiveIntensity={emI * 0.4} />
      </RoundedBox>

      {/* Kol dayamalar */}
      {[-0.24, 0.24].map((x, i) => (
        <RoundedBox key={i} args={[0.055, 0.07, 0.32]} radius={0.02} smoothness={3} position={[x, 0.08, 0]}>
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.35} />
        </RoundedBox>
      ))}

      {/* Numara etiketi */}
      <Text position={[0, 0.14, 0.2]} fontSize={0.09} color={isSelected || status === 'sold' ? '#fff' : '#a0ffd0'}
        anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.006}>
        {seatNumber}
      </Text>

      {/* Durum renk şeridi */}
      <mesh position={[0, 0.52, -0.125]}>
        <boxGeometry args={[0.35, 0.04, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>

      {/* Seçim halkası */}
      {isSelected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.24, 0.30, 36]} />
          <meshBasicMaterial color="#7c6bff" opacity={0.8} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Hover glow */}
      {hov && canSel && <pointLight color="#a78bff" intensity={0.8} distance={1.0} />}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SEAT GRID
// ═══════════════════════════════════════════════════════════════════
function SeatGrid({ seats, selectedSeats, onSeatClick, onSeatFocus }) {
  const items = useMemo(() => {
    const out = []
    const cols = [
      { x: -0.92, col: 0 },
      { x: -0.47, col: 1 },
      { x:  0.47, col: 2 },
      { x:  0.92, col: 3 },
    ]
    for (let row = 0; row < ROWS; row++) {
      const z = Z_FIRST + row * ROW_STEP
      cols.forEach(({ x, col }) => {
        const num  = row * COLS + col + 1
        const data = seats.find(s => s.seat_number === num) || { seat_number: num, status: 'available' }
        out.push(
          <Seat key={num} position={[x, -0.08, z]}
            seatNumber={num} status={data.status}
            isSelected={selectedSeats.includes(num)}
            onClick={onSeatClick} onFocus={onSeatFocus} />
        )
      })
    }
    return out
  }, [seats, selectedSeats, onSeatClick, onSeatFocus])

  return <group>{items}</group>
}

// ═══════════════════════════════════════════════════════════════════
// BUS INTERIOR — duvarlar, tavan, camlar (opacity:0.3), zemin
// ═══════════════════════════════════════════════════════════════════
function BusInterior() {
  const BW = 3.0    // bus width
  const BH = 1.9    // bus height
  const BL = 12.0   // bus length
  const mY = BH / 2 - 0.46  // wall center y

  const winZ = [-4, -2.5, -1.0, 0.5, 2.0, 3.5]

  return (
    <group>
      {/* Zemin */}
      <mesh position={[0, -0.46, 0]} receiveShadow>
        <boxGeometry args={[BW, 0.1, BL]} />
        <meshStandardMaterial color="#0f1218" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Zemin koridor halısı */}
      <mesh position={[0, -0.41, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.65, BL - 0.2]} />
        <meshStandardMaterial color="#1c1030" roughness={1.0} />
      </mesh>

      {/* Tavan */}
      <mesh position={[0, BH - 0.5, 0]}>
        <boxGeometry args={[BW, 0.08, BL]} />
        <meshStandardMaterial color="#0d0f1a" roughness={0.95} />
      </mesh>

      {/* Sol duvar */}
      <mesh position={[-BW / 2, mY, 0]}>
        <boxGeometry args={[0.08, BH, BL]} />
        <meshStandardMaterial color="#111420" roughness={0.85} />
      </mesh>

      {/* Sağ duvar */}
      <mesh position={[BW / 2, mY, 0]}>
        <boxGeometry args={[0.08, BH, BL]} />
        <meshStandardMaterial color="#111420" roughness={0.85} />
      </mesh>

      {/* Sol camlar — opacity 0.3 */}
      {winZ.map((z, i) => (
        <mesh key={`wl${i}`} position={[-BW / 2 + 0.05, mY + 0.18, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 0.55]} />
          <meshStandardMaterial color="#88c8ff" opacity={0.30} transparent roughness={0.05} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Sağ camlar — opacity 0.3 */}
      {winZ.map((z, i) => (
        <mesh key={`wr${i}`} position={[BW / 2 - 0.05, mY + 0.18, z]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 0.55]} />
          <meshStandardMaterial color="#88c8ff" opacity={0.30} transparent roughness={0.05} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Güneş şerit efekti — sol cam içleri */}
      {winZ.slice(0, 4).map((z, i) => (
        <mesh key={`sh${i}`} position={[-BW / 2 + 0.6, mY + 0.1, z]} rotation={[0, 0, 0.15]}>
          <planeGeometry args={[0.7, 0.5]} />
          <meshBasicMaterial color="#fff8e0" opacity={0.045} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Ön duvar — sürücü kabini */}
      <mesh position={[0, mY, -BL / 2]}>
        <boxGeometry args={[BW, BH, 0.1]} />
        <meshStandardMaterial color="#0a0c18" roughness={0.9} />
      </mesh>
      {/* Ön cam */}
      <mesh position={[0, mY + 0.3, -BL / 2 + 0.07]}>
        <planeGeometry args={[2.0, 0.7]} />
        <meshStandardMaterial color="#4090d0" opacity={0.28} transparent roughness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {/* Dashboard */}
      <RoundedBox args={[2.6, 0.12, 0.55]} radius={0.02} position={[0, -0.38, -BL / 2 + 0.5]}>
        <meshStandardMaterial color="#080a14" roughness={0.6} metalness={0.4} />
      </RoundedBox>

      {/* Arka duvar — kapı */}
      <mesh position={[0, mY, BL / 2]}>
        <boxGeometry args={[BW, BH, 0.1]} />
        <meshStandardMaterial color="#0a0c18" roughness={0.9} />
      </mesh>
      {/* Kapı açıklığı */}
      <mesh position={[0.3, -0.05, BL / 2 - 0.06]}>
        <planeGeometry args={[1.0, 1.6]} />
        <meshBasicMaterial color="#000308" opacity={0.95} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Kapı tutamak barı */}
      <mesh position={[0.78, 0.5, BL / 2 - 0.05]}>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        <meshStandardMaterial color="#999" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Overhead bagaj rafları sol */}
      {winZ.slice(0, 5).map((z, i) => (
        <RoundedBox key={`bL${i}`} args={[0.58, 0.30, 0.88]} radius={0.03} position={[-1.2, BH - 0.65, z]}>
          <meshStandardMaterial color="#0e1120" roughness={0.88} />
        </RoundedBox>
      ))}
      {/* Overhead bagaj rafları sağ */}
      {winZ.slice(0, 5).map((z, i) => (
        <RoundedBox key={`bR${i}`} args={[0.58, 0.30, 0.88]} radius={0.03} position={[1.2, BH - 0.65, z]}>
          <meshStandardMaterial color="#0e1120" roughness={0.88} />
        </RoundedBox>
      ))}

      {/* LED tavan şeridi */}
      <mesh position={[0, BH - 0.54, 0]}>
        <boxGeometry args={[0.12, 0.02, BL - 0.3]} />
        <meshBasicMaterial color="#7c6bff" opacity={0.9} transparent />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════
// LIGHTING — AmbientLight 0.5 + tavan spot dizisi + güneş şeritleri
// ═══════════════════════════════════════════════════════════════════
function InteriorLights() {
  const spotZ = [-4, -2, 0, 2, 4]
  return (
    <>
      {/* AmbientLight — şiddet: 0.5, talep edildiği gibi */}
      <ambientLight intensity={0.5} color="#c8d0ff" />

      {/* Ana directional ışık */}
      <directionalLight
        position={[0, 5, 2]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={25}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {/* Tavan LED spots — koridor boyunca */}
      {spotZ.map((z, i) => (
        <pointLight key={`sp${i}`}
          position={[0, 1.25, z]}
          intensity={1.6}
          color="#ddd8ff"
          distance={4.5}
          decay={2}
        />
      ))}

      {/* Mor LED strip renk vurgusu */}
      <pointLight position={[0, 1.3, 0]} intensity={0.5} color="#7c6bff" distance={14} decay={1.2} />

      {/* Güneş şeritleri — sol pencereler */}
      {[-4, -1.5, 1.5, 4].map((z, i) => (
        <spotLight key={`sun${i}`}
          position={[-3.2, 1.1, z]}
          intensity={0.9}
          angle={0.24}
          penumbra={0.85}
          color="#fff4d0"
          distance={8}
          decay={2}
        />
      ))}

      {/* Yan dolgu ışıkları */}
      <pointLight position={[ 2.2, 0.8, 0]} intensity={0.6} color="#b8d0ff" distance={8} decay={1.5} />
      <pointLight position={[-2.2, 0.8, 0]} intensity={0.6} color="#b8d0ff" distance={8} decay={1.5} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// DOLLY CAMERA — z ekseninde kamera kaydırma
// OrbitControls ile çakışmaz: sadece position.z + target.z günceller
// ═══════════════════════════════════════════════════════════════════
function DollyCamera({ focusTarget, controlsRef }) {
  const { camera } = useThree()
  const targetZ = useRef(4.5)
  const CAM_Y   = 1.5
  const Z_MIN   = -3.5
  const Z_MAX   =  5.0

  // Tekerlek scroll
  useEffect(() => {
    const onWheel = (e) => {
      targetZ.current = clamp(targetZ.current - e.deltaY * 0.005, Z_MIN, Z_MAX)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  // Koltuk focus
  useEffect(() => {
    if (focusTarget) {
      targetZ.current = clamp(focusTarget[2] + 2.0, Z_MIN, Z_MAX)
    }
  }, [focusTarget])

  useFrame((_, dt) => {
    const decay  = 1 - Math.exp(-5 * dt)
    const smoothZ = L(camera.position.z, targetZ.current, decay)
    camera.position.z = smoothZ
    camera.position.y = CAM_Y
    // OrbitControls target'ı kamerayla birlikte kaydır
    if (controlsRef?.current) {
      controlsRef.current.target.z = L(controlsRef.current.target.z, smoothZ - 4.0, decay)
      controlsRef.current.update()
    }
  })

  return null
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════
export default function BusScene({ seats = [], selectedSeats = [], onSeatClick = () => {} }) {
  const [focusTarget, setFocusTarget]  = useState(null)
  const controlsRef = useRef()

  const handleFocus = useCallback((pos) => {
    setFocusTarget([...pos])
  }, [])

  return (
    <Canvas
      camera={{ position: [0, 1.5, 4.5], fov: 75, near: 0.05, far: 60 }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      shadows
      style={{ background: '#05060f' }}
    >
      <Suspense fallback={null}>

        {/* Işıklandırma */}
        <InteriorLights />

        {/* Otobüs iç mekan */}
        <BusInterior />

        {/* Koltuklar */}
        <SeatGrid
          seats={seats}
          selectedSeats={selectedSeats}
          onSeatClick={onSeatClick}
          onSeatFocus={handleFocus}
        />

        {/* Zemin gölgeler — hafif plane */}
        <mesh position={[0, -0.395, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.8, 11.5]} />
          <meshStandardMaterial color="#000018" opacity={0.4} transparent depthWrite={false} />
        </mesh>

        {/* Dolly kamera (z ekseninde scroll) */}
        <DollyCamera focusTarget={focusTarget} controlsRef={controlsRef} />

        {/* OrbitControls — otobüs içi kısıtlı */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.0, 0.5]}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={10}
          minAzimuthAngle={-Math.PI * 0.30}
          maxAzimuthAngle={ Math.PI * 0.30}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
          rotateSpeed={0.5}
        />

      </Suspense>
    </Canvas>
  )
}
