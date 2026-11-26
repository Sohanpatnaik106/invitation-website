import type { CSSProperties } from 'react'
import { wedding } from './content'

function scatter(index: number, salt: number) {
  let value = index + salt
  value = Math.imul(value ^ value >>> 16, 0x7feb352d)
  value = Math.imul(value ^ value >>> 15, 0x846ca68b)
  return ((value ^ value >>> 16) >>> 0) / 4294967296
}

export default function CelebrationOrnaments({ backdrop = false }: { backdrop?: boolean }) {
  return <div className="celebration-ornaments" aria-hidden="true">
    {backdrop && <div className="royal-backdrop">
      <div className="royal-garland"><img src={wedding.ornaments.canopy} alt="" width={1200} height={220} /></div>
    </div>}
    {Array.from({ length: 18 }, (_, index) => <i key={index} className={index % 7 === 1 ? 'shower-flower' : 'shower-petal'} style={{
      '--petal-x': `${3 + scatter(index, 17) * 94}%`,
      '--petal-drift': `${scatter(index, 73) * 104 - 52}px`,
      '--petal-turn': `${scatter(index, 131) * 420 - 210}deg`,
      '--petal-start': `${scatter(index, 211) * 180 - 90}deg`,
      '--petal-size': `${(index % 7 === 1 ? 9 : 5) + scatter(index, 307) * 5}px`,
      '--petal-delay': `${scatter(index, 401) * 2.9}s`,
      '--petal-duration': `${4.1 + scatter(index, 503) * 1.5}s`,
      '--petal-opacity': .45 + scatter(index, 601) * .2,
      '--petal-color': ['#e4b376', '#c8798c', '#f4e4ce'][Math.floor(scatter(index, 701) * 3)],
    } as CSSProperties}>{index % 7 === 1 && <img src={wedding.ornaments.petal} alt="" width={64} height={88} />}</i>)}
  </div>
}