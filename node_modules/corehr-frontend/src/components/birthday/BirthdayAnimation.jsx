/**
 * BirthdayAnimation — Canvas-based "HAPPY BIRTHDAY!" animation.
 * Each letter is launched as a firework, explodes into shards,
 * then floats up inside a balloon — matching the CoreHR Django version.
 */
import { useEffect, useRef } from 'react'

const TEXT     = 'HAPPY BIRTHDAY!'
const DURATION = 12000 // ms before auto-dismiss

function randomBetween(a, b) { return a + Math.random() * (b - a) }

class LetterParticle {
  constructor(canvas, char, index, total) {
    this.canvas  = canvas
    this.ctx     = canvas.getContext('2d')
    this.char    = char
    this.index   = index
    this.total   = total
    this.phase   = 'firework'  // firework → contemplate → balloon

    // Final x position spread evenly across canvas
    this.targetX = (canvas.width / (total + 1)) * (index + 1)
    this.targetY = canvas.height * 0.35

    // Firework: launch from bottom center
    this.x     = canvas.width / 2
    this.y     = canvas.height + 20
    this.vx    = (this.targetX - this.x) / 60
    this.vy    = -18 - randomBetween(0, 6)
    this.ax    = 0
    this.ay    = 0.35
    this.alpha = 1
    this.scale = 1

    // Shards for contemplate phase
    this.shards = []
    this.shardTimer = 0
    this.contemplateDuration = 80

    // Balloon
    this.balloonY    = this.targetY
    this.balloonVY   = -0.6 - randomBetween(0, 0.4)
    this.sway        = 0
    this.swaySpeed   = randomBetween(0.02, 0.04)
    this.swayAmp     = randomBetween(8, 18)

    this.done = false
    this.hue  = randomBetween(0, 360)
  }

  launchShards() {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i + randomBetween(-0.2, 0.2)
      const speed = randomBetween(3, 8)
      this.shards.push({
        x: this.targetX, y: this.targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        radius: randomBetween(3, 7),
        hue: randomBetween(0, 360),
      })
    }
  }

  update() {
    if (this.phase === 'firework') {
      this.x  += this.vx
      this.y  += this.vy
      this.vy += this.ay

      if (this.y <= this.targetY) {
        this.x = this.targetX
        this.y = this.targetY
        this.phase = 'contemplate'
        this.launchShards()
      }

    } else if (this.phase === 'contemplate') {
      this.shards.forEach(s => {
        s.x     += s.vx
        s.y     += s.vy
        s.vy    += 0.15
        s.alpha -= 0.025
        s.vx    *= 0.96
      })
      this.shards = this.shards.filter(s => s.alpha > 0)
      this.shardTimer++

      if (this.shardTimer > this.contemplateDuration) {
        this.phase = 'balloon'
        this.balloonY = this.targetY
        this.sway     = 0
      }

    } else if (this.phase === 'balloon') {
      this.sway       += this.swaySpeed
      this.balloonY   += this.balloonVY
      this.x = this.targetX + Math.sin(this.sway) * this.swayAmp

      if (this.balloonY < -120) this.done = true
    }
  }

  draw() {
    const ctx = this.ctx

    if (this.phase === 'firework') {
      // Glowing trail dot
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.shadowBlur  = 12
      ctx.shadowColor = `hsl(${this.hue}, 100%, 70%)`
      ctx.fillStyle   = `hsl(${this.hue}, 100%, 70%)`
      ctx.beginPath()
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

    } else if (this.phase === 'contemplate') {
      // Shards
      this.shards.forEach(s => {
        ctx.save()
        ctx.globalAlpha = s.alpha
        ctx.fillStyle   = `hsl(${s.hue}, 100%, 65%)`
        ctx.shadowBlur  = 8
        ctx.shadowColor = `hsl(${s.hue}, 100%, 65%)`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Letter hovering
      ctx.save()
      ctx.font         = `bold 36px "Lobster", cursive`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = `hsl(${this.hue}, 80%, 55%)`
      ctx.shadowBlur   = 10
      ctx.shadowColor  = `hsl(${this.hue}, 80%, 70%)`
      ctx.fillText(this.char, this.x, this.y)
      ctx.restore()

    } else if (this.phase === 'balloon') {
      const bx = this.x
      const by = this.balloonY
      const rw = 30
      const rh = 36

      ctx.save()

      // Balloon body
      ctx.beginPath()
      ctx.ellipse(bx, by, rw, rh, 0, 0, Math.PI * 2)
      const grad = ctx.createRadialGradient(bx - 10, by - 12, 3, bx, by, rw)
      grad.addColorStop(0, `hsl(${this.hue}, 100%, 80%)`)
      grad.addColorStop(1, `hsl(${this.hue}, 90%, 50%)`)
      ctx.fillStyle = grad
      ctx.shadowBlur   = 12
      ctx.shadowColor  = `hsl(${this.hue}, 70%, 50%)`
      ctx.fill()
      ctx.strokeStyle = `hsl(${this.hue}, 60%, 40%)`
      ctx.lineWidth   = 1.2
      ctx.stroke()

      // Knot
      ctx.beginPath()
      ctx.moveTo(bx, by + rh)
      ctx.lineTo(bx - 4, by + rh + 6)
      ctx.lineTo(bx + 4, by + rh + 6)
      ctx.closePath()
      ctx.fillStyle = `hsl(${this.hue}, 80%, 45%)`
      ctx.fill()

      // String
      ctx.beginPath()
      ctx.moveTo(bx, by + rh + 6)
      ctx.quadraticCurveTo(bx + 10, by + rh + 30, bx, by + rh + 55)
      ctx.strokeStyle = `rgba(100,100,100,0.5)`
      ctx.lineWidth   = 1
      ctx.stroke()

      // Letter on balloon
      ctx.font         = `bold 22px "Lobster", cursive`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = `rgba(255,255,255,0.95)`
      ctx.shadowBlur   = 0
      ctx.fillText(this.char, bx, by - 2)

      ctx.restore()
    }
  }
}

export default function BirthdayAnimation({ onDone }) {
  const canvasRef = useRef()
  const rafRef    = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let width, height

    const resize = () => {
      width = canvas.width  = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Stagger particle creation
    const chars   = TEXT.split('')
    const total   = chars.length
    const particles = []
    chars.forEach((char, i) => {
      setTimeout(() => {
        particles.push(new LetterParticle(canvas, char, i, total))
      }, i * 400)
    })

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      onDone?.()
      localStorage.setItem('birthdayShown', 'true')
    }, DURATION)

    let frame = 0
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)

      // Starfield background fade
      ctx.fillStyle = 'rgba(5, 15, 25, 0.18)'
      ctx.fillRect(0, 0, width, height)

      // Subtle twinkling stars
      if (frame % 3 === 0) {
        ctx.save()
        ctx.fillStyle = `rgba(255,255,255,${randomBetween(0.3, 0.8)})`
        ctx.beginPath()
        ctx.arc(randomBetween(0, width), randomBetween(0, height * 0.6), 1, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      particles.forEach(p => { p.update(); p.draw() })
      frame++
    }
    loop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(dismissTimer)
      window.removeEventListener('resize', resize)
    }
  }, [onDone])

  return (
    <div
      onClick={() => { onDone?.(); localStorage.setItem('birthdayShown', 'true') }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5, 15, 25, 0.92)',
        cursor: 'pointer',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', pointerEvents: 'none',
      }}>
        Click anywhere to dismiss
      </div>
    </div>
  )
}
