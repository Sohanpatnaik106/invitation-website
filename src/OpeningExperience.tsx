import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, Film, Play } from 'lucide-react'
import { wedding } from './content'

type Stage = 'sealed' | 'unsealing' | 'film' | 'entering'

export default function OpeningExperience({ onOpen, onStart }: { onOpen: () => void; onStart: () => void }) {
  const [stage, setStage] = useState<Stage>('sealed')
  const [failed, setFailed] = useState(false)
  const [portrait, setPortrait] = useState(() => matchMedia('(orientation: portrait)').matches)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [playBlocked, setPlayBlocked] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const enterButton = useRef<HTMLButtonElement>(null)
  const hasFilm = Boolean(wedding.media.openingVideo) && !failed
  const filmSource = portrait && wedding.media.openingVideoPortrait ? wedding.media.openingVideoPortrait : wedding.media.openingVideo
  useEffect(() => {
    const orientation = matchMedia('(orientation: portrait)')
    const update = () => setPortrait(orientation.matches)
    orientation.addEventListener('change', update)
    return () => orientation.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(motion.matches)
      if (motion.matches) video.current?.pause()
    }
    motion.addEventListener('change', update)
    return () => motion.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (stage === 'film') enterButton.current?.focus({ preventScroll: true })
  }, [stage])
  useEffect(() => {
    if (stage !== 'unsealing') return
    const release = window.setTimeout(() => setStage('film'), 550)
    return () => window.clearTimeout(release)
  }, [stage])
  useEffect(() => {
    if (stage !== 'entering') return
    if (reducedMotion) { onOpen(); return }
    const completion = window.setTimeout(onOpen, 1100)
    return () => window.clearTimeout(completion)
  }, [stage, reducedMotion, onOpen])
  useEffect(() => {
    if (stage !== 'film' || reducedMotion || !hasFilm) return
    video.current?.play().catch(() => setPlayBlocked(true))
  }, [stage, reducedMotion, hasFilm, filmSource])

  function enter() {
    video.current?.pause()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) onOpen()
    else setStage('entering')
  }

  const sealed = stage === 'sealed' || stage === 'unsealing'
  return <section className={`opening opening-${sealed ? 'sealed' : stage}${stage === 'unsealing' ? ' opening-unsealing' : ''}`} style={{ '--velvet-texture': `url(${wedding.textures.velvet})` } as CSSProperties} aria-labelledby="opening-title" onAnimationEnd={event => {
    if (event.target === event.currentTarget && stage === 'entering') onOpen()
  }}>
    {sealed && <><div className="opening-grain" aria-hidden="true" /><div className="envelope-flap" aria-hidden="true" /></>}
    <div className="opening-topline"><span>AASTHETICSOHLMATES ORIGINAL</span></div>
    {sealed && <div className="opening-invite">
      <p className="opening-blessing"><img className="opening-ganesh" src={wedding.ganeshSymbol} alt="Lord Ganesh" width="120" height="120" />॥ श्री गणेशाय नमः ॥</p>
      <p className="eyebrow">FOR YOU & YOUR LOVED ONES</p>
      <h1 id="opening-title">A celebration<br /><em>awaits.</em></h1>
      <p className="opening-dedication">A moment to gather,<br />an occasion to cherish.</p>
      <button className="seal-opener" aria-label="Open the invitation" disabled={stage === 'unsealing'} onClick={() => { onStart(); setStage(reducedMotion ? 'film' : 'unsealing') }}>
        <span className="wax-seal"><img src={wedding.monogramImage} alt="Wedding monogram" width="160" height="160" /></span>
        <span className="seal-instruction">CLICK THE SEAL TO OPEN</span>
      </button>
      <span className="opening-hashtag">{wedding.hashtag}</span>
    </div>}
    {stage !== 'sealed' && <div className="opening-film" hidden={stage === 'unsealing'}>
      <h1 className="sr-only" id={sealed ? undefined : 'opening-title'}>Sohan & Aastha — the opening film</h1>
      {hasFilm ? <video key={filmSource} ref={video} className="prologue-video" aria-label="Wedding opening film" src={filmSource} poster={wedding.media.openingPoster || undefined} muted playsInline disablePictureInPicture disableRemotePlayback tabIndex={-1} preload="auto" onEnded={enter} onError={() => setFailed(true)} /> : <div className="prologue-placeholder" aria-label="Animated opening preview; opening video unavailable">
        <div className="film-arch arch-one" aria-hidden="true" /><div className="film-arch arch-two" aria-hidden="true" />
        <div className="film-light" aria-hidden="true" />
        <div className="film-frame frame-one"><p className="eyebrow">THE SEAL IS OPEN.</p><h2>Come a little closer.</h2></div>
        <div className="film-frame frame-two"><p className="eyebrow">A FIRST GLIMPSE</p><h2>The setting can wait.</h2></div>
        <div className="film-frame frame-three"><p className="eyebrow">LET THE INVITATION UNFOLD.</p><h2>Sohan <em>&</em> Aastha</h2><p>The details are yours to discover.</p></div>
        <span className="film-placeholder-label"><Film size={12} /> ANIMATED PREVIEW · OPENING VIDEO UNAVAILABLE</span>
      </div>}
      <div className="film-toolbar">{playBlocked && hasFilm && <button className="button secondary" onClick={() => { video.current?.play().then(() => setPlayBlocked(false)).catch(() => setFailed(true)) }}><Play size={16} /> Play opening film</button>}<button ref={enterButton} className="button primary" onClick={enter}>Enter the celebration <ArrowRight size={16} /></button></div>
    </div>}
  </section>
}