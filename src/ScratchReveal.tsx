import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, CalendarDays } from 'lucide-react'
import CelebrationOrnaments from './CelebrationOrnaments'

export default function ScratchReveal({ onSave, onReveal, onContinue, countdown, initiallyRevealed = false }: { onSave: () => void; onReveal: () => void; onContinue?: () => void; countdown?: ReactNode; initiallyRevealed?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const glint = useRef<HTMLSpanElement>(null)
  const previous = useRef<{ x: number; y: number } | null>(null)
  const [revealed, setRevealed] = useState(initiallyRevealed)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const context = canvas.current?.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const gradient = context.createLinearGradient(0, 0, 900, 450)
    gradient.addColorStop(0, '#d7ba83'); gradient.addColorStop(.3, '#f1deaf')
    gradient.addColorStop(.65, '#b8955b'); gradient.addColorStop(1, '#e6c992')
    context.fillStyle = gradient; context.fillRect(0, 0, 900, 450)
    // Original geometric foil pattern; no image downloads or canvas tainting.
    context.strokeStyle = '#77573526'; context.lineWidth = 1
    for (let x = -450; x < 1350; x += 30) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x + 450, 450); context.stroke()
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x - 450, 450); context.stroke()
    }
    context.strokeStyle = '#fff3caaa'; context.lineWidth = 3
    context.strokeRect(22, 22, 856, 406)
    context.strokeStyle = '#77573577'; context.lineWidth = 2
    context.strokeRect(29, 29, 842, 392)
    context.textAlign = 'center'; context.fillStyle = '#704523'
    context.font = 'italic 64px Georgia'; context.fillText('The dates await.', 450, 210)
    context.font = '18px sans-serif'; context.fillText('S C R A T C H   T O   R E V E A L', 450, 270)
    context.font = '25px Georgia'; context.fillText('✦', 450, 135)
  }, [])

  function revealDates() {
    if (revealed) return
    setRevealed(true)
    onReveal()
  }

  function scratch(event: PointerEvent<HTMLCanvasElement>) {
    if (!previous.current || revealed) return
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    const point = { x: (event.clientX - rect.left) * 900 / rect.width, y: (event.clientY - rect.top) * 450 / rect.height }
    const context = element.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'destination-out'
    context.lineWidth = 85; context.lineCap = 'round'; context.lineJoin = 'round'
    context.beginPath(); context.moveTo(previous.current.x, previous.current.y); context.lineTo(point.x, point.y); context.stroke()
    previous.current = point
    if (glint.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      glint.current.style.left = `${event.clientX - rect.left}px`
      glint.current.style.top = `${event.clientY - rect.top}px`
      glint.current.getAnimations().forEach(animation => animation.cancel())
      glint.current.animate([{ opacity: 1, transform: 'translate(-50%, -50%) scale(.7) rotate(0deg)' }, { opacity: 0, transform: 'translate(-50%, -50%) scale(1.5) rotate(35deg)' }], { duration: 420, easing: 'ease-out' })
    }
  }

  function finishStroke() {
    previous.current = null
    const context = canvas.current?.getContext('2d')
    if (!context || revealed) return
    const pixels = context.getImageData(0, 0, 900, 450).data
    let clear = 0, total = 0
    for (let index = 3; index < pixels.length; index += 64) { total++; if (pixels[index] < 100) clear++ }
    const percentage = Math.round(clear / total * 100)
    setProgress(percentage)
    if (percentage >= 38) revealDates()
  }

  return <section id="dates" className={`scratch-section page-width section ${revealed ? 'is-revealed' : ''}`} aria-labelledby="scratch-title">
    <CelebrationOrnaments backdrop />
    <div className="scratch-copy"><p className="eyebrow">THE COUNTDOWN BEGINS</p><h2 id="scratch-title" tabIndex={-1}>Save the <em>Dates.</em></h2><p>The festivities are planned, the excitement is looming, and the dates are yours to discover.</p></div>
    <div className="scratch-interaction"><div className="scratch-card">
      <div className="scratch-date" aria-hidden={!revealed}><p className="eyebrow">MAKE ROOM IN YOUR DIARY</p><strong>30 <em>&</em> 31</strong><span>JANUARY 2027</span>{revealed ? countdown : <p>Two days to gather, dress up, and celebrate.</p>}</div>
      <canvas ref={canvas} width={900} height={450} className={revealed ? 'foil revealed' : 'foil'} aria-hidden="true" onPointerDown={event => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const rect = event.currentTarget.getBoundingClientRect()
        previous.current = { x: (event.clientX - rect.left) * 900 / rect.width, y: (event.clientY - rect.top) * 450 / rect.height }
        scratch(event)
      }} onPointerMove={scratch} onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} />
      <div className="reveal-sparkles" aria-hidden="true">✦ <span>✧</span> ✦</div>
      <span ref={glint} className="scratch-glint" aria-hidden="true">✦ · ✧</span>
    </div><div className="scratch-controls">{revealed ? <><span className="sr-only" role="status">30–31 January 2027. It’s a date!</span><button className="button primary" onClick={onSave}><CalendarDays size={16} /> Save the dates</button></> : <><span className="sr-only">{progress ? `${progress}% uncovered · keep going` : ''}</span><button className="button primary" onClick={revealDates}>Click to reveal the dates <ArrowRight size={15} /></button></>}</div></div>
    {onContinue && <div className={`section-next${revealed ? '' : ' reveal-pending'}`}><button className="button primary" disabled={!revealed} onClick={onContinue}>Next: the venue <ArrowRight size={18} /></button></div>}
  </section>
}