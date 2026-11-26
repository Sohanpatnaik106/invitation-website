import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Download, Film, Flower2, Info, Leaf, MapPin, Music2, Phone, Play, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { events, getInvitationContent, wedding } from './content'
import type { WeddingEvent } from './content'
import OpeningExperience from './OpeningExperience'
import ScratchReveal from './ScratchReveal'
import FamilyInvitation from './FamilyInvitation.tsx'
import Venue from './Venue'
import CelebrationOrnaments from './CelebrationOrnaments'
import './App.css'
import './cinematic.css'

type Modal = { kind: 'invitation' } | { kind: 'trailer' } | { kind: 'event'; event: WeddingEvent } | null
type TeaserVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean }
const materialStyle = { '--velvet-texture': `url(${wedding.textures.velvet})`, '--parchment-texture': `url(${wedding.textures.parchment})` } as CSSProperties
function Monogram({ small = false }: { small?: boolean }) {
  return <span className={`monogram ${small ? 'small' : ''}`} aria-label="Sohan and Aastha monogram"><span>S</span><span>A</span><i /></span>
}
function EventMotif({ theme }: { theme: string }) {
  const Icon = theme === 'mehendi' ? Leaf : theme === 'sangeet' ? Music2 : theme === 'haldi' ? Flower2 : Sparkles
  return <div className={`event-motif motif-${theme}`} aria-hidden="true"><Icon className="motif-corner motif-start" size={30} /><Icon className="motif-corner motif-end" size={30} /><span className="motif-rule" /><span className="motif-light" /></div>
}
function Artwork({ theme = 'emerald', className = '', image, alt = '', children }: { theme?: string; className?: string; image?: string; alt?: string; children?: ReactNode }) {
  return <div className={`artwork art-${theme} ${className}`}>
    {image ? <img src={image} alt={alt} loading={className === 'hero-art' ? 'eager' : 'lazy'} fetchPriority={className === 'hero-art' ? 'high' : 'auto'} /> : <div className="art-scene" aria-hidden="true"><div className="art-orbit" /><div className="art-orbit second" /><div className="art-arch" /><div className="art-arch inner" /><div className="art-sun" /><div className="art-floor" /><div className="art-flower flower-one">✳</div><div className="art-flower flower-two">✳</div><div className="art-stars">✦</div></div>}
    {image && ['mehendi', 'sangeet', 'haldi', 'shaadi'].includes(theme) && <EventMotif theme={theme} />}{children}
  </div>
}
function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const seconds = Math.max(0, Math.floor((Date.parse(wedding.countdownDate) - now) / 1000))
  const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
  return <div className="countdown" aria-label="Countdown to the wedding weekend">{values.map((value, index) => <div key={index}><strong>{String(value).padStart(2, '0')}</strong><span>{['DAYS', 'HOURS', 'MINUTES', 'SECONDS'][index]}</span></div>)}</div>
}
function saveDates() {
  const programme = events.flatMap(event => event.schedule.map(item => `${event.day} January: ${item.name} ${item.time}${item.note ? ` (${item.note})` : ''}`)).join('\\n')
  const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sohan and Aastha//Wedding//EN', 'BEGIN:VEVENT', 'UID:sohan-aastha-20270130@wedding', `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, 'DTSTART;VALUE=DATE:20270130', 'DTEND;VALUE=DATE:20270201', 'SUMMARY:Sohan & Aastha wedding weekend', `LOCATION:${wedding.venue.replace(/,/g, '\\,')}`, `DESCRIPTION:${programme.replace(/,/g, '\\,')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sohan-aastha-save-the-dates.ics'; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function App() {
  const invitation = getInvitationContent(window.location.pathname)
  const [opened, setOpened] = useState(false)
  const [teaserVisible, setTeaserVisible] = useState(false)
  const [datesVisible, setDatesVisible] = useState(false)
  const [teaserPlayed, setTeaserPlayed] = useState(false)
  const [teaserFailed, setTeaserFailed] = useState(false)
  const [datesRevealed, setDatesRevealed] = useState(false)
  const [venueRevealed, setVenueRevealed] = useState(false)
  const [musicStarted, setMusicStarted] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicError, setMusicError] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const teaser = useRef<TeaserVideo>(null)
  const resumeAfterTeaser = useRef(false)
  const [modal, setModal] = useState<Modal>(null)
  const [closingModal, setClosingModal] = useState<Modal>(null)
  const [day, setDay] = useState('all')
  const dialog = useRef<HTMLDialogElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const [railEdges, setRailEdges] = useState({ start: true, end: true })
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = rail.current
    if (!venueRevealed || !element) return
    const update = () => {
      const start = element.scrollLeft <= 1
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
      setRailEdges(previous => previous.start === start && previous.end === end ? previous : { start, end })
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    for (const card of element.children) observer.observe(card)
    element.addEventListener('scroll', update, { passive: true })
    const frame = requestAnimationFrame(update)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); element.removeEventListener('scroll', update) }
  }, [venueRevealed, day])
  function scrollEpisodes(direction: number) {
    const element = rail.current
    const card = element?.firstElementChild
    if (!element || !card) return
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(element).columnGap)
    element.scrollBy({ left: direction * step, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  function selectDay(value: string) {
    setDay(value)
    requestAnimationFrame(() => rail.current?.scrollTo({ left: 0, behavior: 'instant' }))
  }
  useEffect(() => {
    if (!opened || !header.current) return
    const element = header.current
    const update = () => document.documentElement.style.setProperty('--invitation-header-height', `${element.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    update()
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--invitation-header-height') }
  }, [opened])
  useEffect(() => {
    if (!opened) return
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.getElementById('home')?.focus({ preventScroll: true })
  }, [opened])
  useEffect(() => {
    if (!opened || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target) }
      })
    }, { threshold: .08 })
    document.querySelectorAll('.scrolling-experience :is(.section,.hero,.finale,.premiere-strip):not(.in-view)').forEach(section => {
      section.classList.add('scroll-reveal')
      observer.observe(section)
    })
    return () => observer.disconnect()
  }, [opened, teaserVisible, datesVisible, datesRevealed, venueRevealed])
  useEffect(() => {
    const clip = teaser.current
    if (!teaserVisible || !clip) return
    const observer = new IntersectionObserver(([entry]) => {
      // Scrolling away should not leave the teaser's audio playing off screen.
      if (!entry.isIntersecting && !clip.paused && document.fullscreenElement !== clip && !clip.webkitDisplayingFullscreen) clip.pause()
    })
    observer.observe(clip)
    return () => observer.disconnect()
  }, [teaserVisible])
  useEffect(() => {
    if (!modal) return
    const element = dialog.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element?.showModal()
    if (element) element.scrollTop = 0
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = previous; trigger?.focus({ preventScroll: true }) }
  }, [modal])
  useEffect(() => {
    if (!closingModal) return
    const timer = window.setTimeout(() => {
      setModal(current => current === closingModal ? null : current)
      setClosingModal(null)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [closingModal])
  function closeDialog() {
    if (modal?.kind === 'invitation' && !matchMedia('(prefers-reduced-motion: reduce)').matches) setClosingModal(modal)
    else setModal(null)
  }
  function scrollToSection(id: string) {
    teaser.current?.pause()
    setClosingModal(null)
    setModal(null)
    requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!target) return
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
      const section = target.closest('section') ?? target
      const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - (header.current?.getBoundingClientRect().height ?? 0), behavior })
    })
  }
  function showTeaser() {
    setTeaserVisible(true)
    scrollToSection('teaser-title')
  }
  function showDates() {
    setDatesVisible(true)
    scrollToSection('scratch-title')
  }
  function revealDates() {
    setDatesRevealed(true)
  }
  function revealVenue() {
    setVenueRevealed(true)
  }
  const playMusic = useCallback(() => {
    setMusicStarted(true)
    setMusicError(false)
    const track = audio.current
    if (!track) return
    track.volume = .3
    if (track.error) track.load()
    // Invoke play inside the click gesture, including on mobile Safari.
    void track.play().catch(() => { setMusicPlaying(false); setMusicError(true) })
  }, [])
  const restoreMusic = useCallback(() => {
    if (!resumeAfterTeaser.current || (teaser.current && !teaser.current.paused && !teaser.current.ended && !teaser.current.error)) return
    resumeAfterTeaser.current = false
    playMusic()
  }, [playMusic])
  useEffect(() => {
    // Closing by Escape, backdrop, or the close button all restore the prior music state.
    if (modal?.kind !== 'trailer') restoreMusic()
  }, [modal, restoreMusic])
  function pauseMusicForTeaser() {
    setTeaserPlayed(true)
    if (audio.current && !audio.current.paused) {
      resumeAfterTeaser.current = true
      audio.current.pause()
    }
  }
  function startTeaser() {
    const clip = teaser.current
    if (!clip) return
    pauseMusicForTeaser()
    void clip.play().catch(() => { setTeaserFailed(true); restoreMusic() })
    fullscreenTeaser()
  }
  function fullscreenTeaser() {
    const clip = teaser.current
    if (!clip || document.fullscreenElement || clip.webkitDisplayingFullscreen) return
    try {
      if (clip.requestFullscreen) void clip.requestFullscreen().catch(() => undefined)
      else clip.webkitEnterFullscreen?.()
    } catch { return }
  }
  function handleTeaserPlay() {
    pauseMusicForTeaser()
    fullscreenTeaser()
  }
  function toggleMusic() {
    // Explicitly selecting background music stops the teaser first, preventing overlap.
    resumeAfterTeaser.current = false
    teaser.current?.pause()
    if (audio.current && !audio.current.paused) audio.current.pause()
    else playMusic()
  }
  const musicControl = musicStarted && <div className="music-control">
    <button type="button" onClick={toggleMusic} aria-label={musicPlaying ? 'Pause background music' : 'Play background music'} aria-pressed={musicPlaying}>
      {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}<span>{musicPlaying ? 'Music on' : 'Music off'}</span>
    </button>
    {musicError && <span className="music-error" role="status">Music unavailable. Press play to retry.</span>}
  </div>
  const filtered = events.filter(event => day === 'all' || event.day === day)
  return <>
    <audio ref={audio} className="background-music" src={wedding.media.backgroundMusic} loop preload="none" onPlaying={() => { setMusicPlaying(true); setMusicError(false) }} onPause={() => setMusicPlaying(false)} onError={() => { setMusicPlaying(false); setMusicError(true) }} />
    {!modal && !opened && <div className="opening-music">{musicControl}</div>}
    {!opened ? <OpeningExperience onOpen={() => setOpened(true)} onStart={playMusic} /> : <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header ref={header} className="site-header scroll-header">
      <button className="brand" onClick={() => scrollToSection('home')} aria-label="aastheticsohlmates home">AASTHETIC<span>SOHLMATES</span><small>THE WEDDING EDITION</small></button>
      {!modal && musicControl}
    </header>
    <main id="main" style={materialStyle} className={`celebration-entered scrolling-experience${!teaserVisible && !datesVisible ? ' invitation-preview' : ''}`}>
      <section className="hero" id="home" aria-labelledby="hero-title" tabIndex={-1}>
        <Artwork className="hero-art" image={wedding.media.heroImage} alt="Sohan and Aastha cinematic wedding portrait">{!wedding.media.heroImage && <><div className="hero-emblem"><div className="emblem-circle"><Monogram /></div><span>THE WEDDING WEEKEND</span></div><span className="asset-label"><Film size={12} /> YOUR CINEMATIC PORTRAIT HERE</span></>}</Artwork>
        <div className="hero-shade" />
        <div className="hero-content">
          <h1 id="hero-title">{wedding.hero.title}<br /><em>{wedding.hero.titleAccent}</em></h1>
          <p className="hero-tagline">{wedding.hero.tagline}</p>
          <p className="hero-description">{wedding.hero.synopsis}</p>
          <div className="hero-buttons"><button className="button primary" onClick={() => setModal({ kind: 'invitation' })}><Play size={19} fill="currentColor" aria-hidden="true" />{wedding.hero.action}</button></div>
        </div>
      </section>
      {invitation.showTeaser && teaserVisible && <section className="section page-width journey-teaser scroll-teaser" id="story" aria-labelledby="teaser-title">
        <div className="teaser-intro"><h2 id="teaser-title" tabIndex={-1}>Before the<br /><em>celebrations.</em></h2><p>A little glimpse into the moments leading up to forever</p>{!teaserPlayed && !teaserFailed && wedding.media.trailerVideo && <button className="button primary teaser-play-action" onClick={startTeaser}><Play size={17} /> Play teaser</button>}</div>
        <div className={`journey-film${teaserPlayed ? ' teaser-started' : ''}`}><span className="teaser-aperture" aria-hidden="true" />{wedding.media.trailerVideo ? <video ref={teaser} aria-label="Our teaser" src={wedding.media.trailerVideo} poster={wedding.media.trailerPoster} controls playsInline preload="metadata" onPlay={handleTeaserPlay} onPause={restoreMusic} onEnded={() => { restoreMusic(); teaser.current?.closest('.journey-film')?.classList.add('teaser-finished') }} onError={() => { setTeaserFailed(true); restoreMusic() }} /> : <div className="video-placeholder"><Film size={36} /><p>Teaser unavailable. You can continue.</p></div>}</div>
        <div className="section-next">{teaserFailed && <p role="status">Video unavailable. Continue to the dates below.</p>}<button className={teaserPlayed || teaserFailed ? 'button primary' : 'text-button'} onClick={showDates}>{teaserPlayed || teaserFailed ? 'Click to reveal dates' : 'Continue without video'} <ArrowDown size={18} /></button></div>
      </section>}
      {datesVisible && <ScratchReveal onSave={saveDates} onReveal={revealDates} initiallyRevealed={datesRevealed} countdown={datesRevealed ? <Countdown /> : null} onContinue={() => scrollToSection('venue')} />}
      {datesRevealed && <Venue revealed={venueRevealed} onReveal={revealVenue} onContinue={() => scrollToSection('episodes')} />}
      {venueRevealed && <>
      <section className="section page-width episodes-section" id="episodes">
        <CelebrationOrnaments />
        <div className="section-heading"><div><h2>{wedding.celebrations.title}</h2></div><div className="rail-controls"><button className="icon-button" aria-label="Previous episodes" title="Previous celebration" disabled={railEdges.start} onClick={() => scrollEpisodes(-1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next episodes" title="Next celebration" disabled={railEdges.end} onClick={() => scrollEpisodes(1)}><ChevronRight size={18} /></button></div></div>
        <p className="celebration-intro">{wedding.celebrations.intro}</p>
        <div className="filters" aria-label="Filter events by day">{[['all', 'All episodes'], ['30', '30 January'], ['31', '31 January']].map(([value, label]) => <button key={value} className={day === value ? 'active' : ''} aria-pressed={day === value} onClick={() => selectDay(value)}>{label}</button>)}</div>
        <div className="episode-rail" ref={rail}>{filtered.map(event => <button className="episode-card" key={event.id} onClick={() => setModal({ kind: 'event', event })} aria-label={`Explore ${event.name}`} aria-haspopup="dialog">
          <Artwork theme={event.theme} image={event.image} alt={`${event.name} poster`}><span className="episode-badge">EPISODE {event.id}</span><span className="poster-logo">S<span> ORIGINAL</span></span><div className="poster-title"><span>{event.category}</span><h3>{event.name}</h3><p>{event.tagline}</p></div>{!event.image && <span className="poster-placeholder">POSTER PLACEHOLDER</span>}</Artwork>
          <span className="episode-details">{wedding.celebrations.detailsAction}<ChevronRight size={18} aria-hidden="true" /></span>
          <div className="episode-info"><span>{event.day} JANUARY <i /> {event.category}</span></div>
          <p className="episode-start"><CalendarDays size={14} aria-hidden="true" /><span>{event.schedule[0]?.name} · {event.schedule[0]?.time}</span></p><p className="episode-note">{event.short}</p>
        </button>)}</div><p className="section-footnote"><Info size={13} /> Ceremony times and dress guidance are inside each episode.</p>
      <div className="section-next events-actions"><a className="text-button" href={wedding.wardrobePlanner} download><Download size={16} /> Wardrobe planner</a><button className="text-button" onClick={() => scrollToSection('warm-regards')}>Next: warm regards <ArrowDown size={18} /></button></div>
      </section>
      <section className="finale warm-regards page-width" id="warm-regards" aria-labelledby="regards-title">
        <div className="regards-heading"><span className="regards-crest" aria-hidden="true"><img className="regards-monogram" src={wedding.monogramImage} alt="" /></span><h2 id="regards-title">{wedding.closing.title}</h2><div className="regards-flourish" aria-hidden="true"><span /><Flower2 size={20} /><span /></div></div>
        <div className="regards-details">
          <div className="regards-contacts"><h3>{wedding.closing.rsvp}</h3><p>{wedding.closing.assistance}</p><address>{invitation.closing.contacts.map(contact => <a key={contact.href} href={contact.href} aria-label={`${contact.name} | ${contact.phone}`}><Phone size={17} aria-hidden="true" /><span className="regards-contact-copy"><span>{contact.name}</span><span>{contact.phone}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a>)}</address></div>
          <div className="regards-family"><h3>{wedding.closing.compliments}</h3>{invitation.closing.familyName && <p className="regards-family-name">{invitation.closing.familyName}</p>}<p>{invitation.closing.names}</p></div>
        </div>
        <p className="regards-message">{wedding.closing.message}</p>
      </section>
      </>}
    </main>
    {modal && <dialog ref={dialog} style={materialStyle} className={`modal modal-${modal.kind}${modal === closingModal ? ' modal-rolling-up' : ''}`} aria-labelledby="modal-title" onCancel={event => { event.preventDefault(); closeDialog() }} onClick={e => { if (e.target === e.currentTarget) closeDialog() }}><div className="modal-tools"><button className="modal-close icon-button" onClick={closeDialog} aria-label="Close dialog"><X size={21} /></button>{musicControl}</div>
      {modal.kind === 'invitation' && <div className="invitation royal-scroll"><EventMotif theme="mehendi" /><div className="invitation-heading"><p className="blessing">|| {invitation.invocation} ||</p></div><h2 className="sr-only" id="modal-title">The family invitation</h2><FamilyInvitation content={invitation} />{venueRevealed && <div className="invitation-details"><p><MapPin size={15} /> {wedding.venue}</p></div>}{wedding.media.invitationVideo && <video src={wedding.media.invitationVideo} controls playsInline preload="metadata" />}<div className="invitation-action"><button className="button primary" onClick={invitation.showTeaser ? showTeaser : showDates}>{invitation.showTeaser ? 'Click to watch teaser' : 'Click to reveal dates'} <ArrowRight size={16} /></button></div></div>}
      {modal.kind === 'trailer' && <div className="trailer"><p className="eyebrow">THE PERSONAL PREVIEW</p><h2 id="modal-title">A moment, just the two of us.</h2>{wedding.media.trailerVideo ? <video ref={teaser} src={wedding.media.trailerVideo} controls playsInline preload="metadata" onPlay={pauseMusicForTeaser} onPause={restoreMusic} onEnded={restoreMusic} onError={restoreMusic} /> : <div className="video-placeholder"><Film size={40} /><h3>The teaser is on its way.</h3><p>A short introduction to the couple will go here.</p><span>VIDEO PLACEHOLDER · PORTRAIT · MP4</span></div>}<p className="muted">A quiet interlude before the family festivities.</p></div>}
      {modal.kind === 'event' && <div className={`event-modal event-programme programme-${modal.event.theme}`}><EventMotif theme={modal.event.theme} />
        <div className={`event-modal-copy${modal.event.id === '04' ? ' event-copy-wedding' : ''}`}>
          <p className="eyebrow">{modal.event.category} · {modal.event.day} JANUARY 2027</p><h2 id="modal-title">{modal.event.name}</h2>
          <p className="event-description">{modal.event.description}</p>
          <h3 className="event-schedule-title">The schedule</h3>
          <div className="event-facts">{modal.event.schedule.map(item => <div key={item.name}><span><CalendarDays size={16} /> {item.name} · {item.time}</span>{item.note && <p>{item.note}</p>}</div>)}</div>
          <h3 className="event-outfit-title">Dress code</h3>
          <div className="event-dress-code">{modal.event.dressCode.map((code, index) => <div key={code.name ?? index}>{code.name && <h4>{code.name}</h4>}<p><strong>Men:</strong> {code.men}</p><p><strong>Women:</strong> {code.women}</p></div>)}</div>
        </div>
      </div>}
    </dialog>}
    </>}
  </>
}
export default App
