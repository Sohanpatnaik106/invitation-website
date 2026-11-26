import { ArrowRight, LockKeyhole, MapPin } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { wedding } from './content'

export default function Venue({ revealed, onReveal, onContinue }: { revealed: boolean; onReveal: () => void; onContinue?: () => void }) {
  const directions = useRef<HTMLAnchorElement>(null)
  useEffect(() => { if (revealed) directions.current?.focus({ preventScroll: true }) }, [revealed])
  return <section className={`section page-width venue-section${revealed ? ' is-revealed' : ''}`} id="venue" aria-labelledby="venue-title">
    <div className="venue-atmosphere" aria-hidden="true">
      <img className="venue-atmosphere-veiled" src={wedding.venueArtwork.veiled} alt="" loading="lazy" decoding="async" />
      <img className="venue-atmosphere-revealed" src={wedding.venueArtwork.revealed} alt="" loading="lazy" decoding="async" />
    </div>
    <div className="section-heading"><h2 id="venue-title" tabIndex={-1}>Where we’ll gather.</h2></div>
    <p className="section-intro venue-intro">Reveal the venue for the wedding celebrations.</p>
    <div className="venue-layout"><div className="venue-copy"><MapPin size={28} /><h3 aria-hidden={!revealed}>{revealed ? wedding.venueName : <span className="venue-seal"><LockKeyhole size={22} /></span>}</h3><p className="venue-city">{revealed ? wedding.venueAddress : <span className="venue-concealed-label">Venue under wraps</span>}</p>{revealed ? <a ref={directions} className="button primary venue-action" href={wedding.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowRight size={17} /></a> : <button className="button primary venue-action" onClick={onReveal}>Click to reveal venue <ArrowRight size={17} /></button>}</div><div className="venue-map"><span className="venue-route" aria-hidden="true" />{revealed ? <iframe title="Google Map — Green Heaven Resort, Bhubaneswar" src={wedding.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /> : <div className="venue-map-preview" aria-hidden="true"><MapPin size={40} /></div>}<div className={`map-caption${revealed ? '' : ' venue-pending'}`}><span><MapPin size={16} /> Your arrival pin</span>{revealed ? <a href={wedding.mapsUrl} target="_blank" rel="noopener noreferrer">Open map <ArrowRight size={16} /></a> : <span>Open map <ArrowRight size={16} /></span>}</div></div></div>
    {revealed && <p className="sr-only" role="status">{wedding.venueName}, {wedding.venueAddress}</p>}
    {onContinue && <div className={`section-next${revealed ? '' : ' venue-pending'}`}><button className="button primary" disabled={!revealed} onClick={onContinue}>Next: celebrations <ArrowRight size={18} /></button></div>}
  </section>
}