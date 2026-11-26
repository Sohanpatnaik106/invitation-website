export type WeddingEvent = {
  id: string; day: string; name: string; category: string; theme: string
  tagline: string; short: string; description: string; outfitMood: string
  men: string; women: string; colors: { name: string; hex: string }[]; image?: string
  schedule: { name: string; time: string; note?: string }[]
  dressCode: { name?: string; men: string; women: string }[]
  ritualOutfits?: { name: string; men: string; women: string }
}
// Supply approved assets in public/media, then enter their /media/... paths here.
const resort = {
  placeId: 'ChIJ863ftVcPGToR996yN-jvYJA',
  featureId: '0x3a190f57b5dfadf3:0x9060efe837b2def7',
  latitude: 20.386727,
  longitude: 85.8234607,
}
export const wedding = {
  metadata: {
    title: 'An Invitation to Celebrate',
    description: "Open to discover what's inside.",
    favicon: '/invitation-icon.svg',
    fallbackIcon: '/favicon.ico',
    image: '/media/celebration-awaits.jpg',
    imageType: 'image/jpeg',
    imageWidth: 1200,
    imageHeight: 675,
    imageAlt: 'An SA wax seal on burgundy velvet, framed by gold foliage, with the words A celebration awaits.',
  },
  hashtag: '#aastheticsohlmates', venue: 'The Green Heaven Resort, Raghunathpur, Bhubaneswar, Odisha',
  venueName: 'The Green Heaven Resort', venueAddress: 'Raghunathpur, Bhubaneswar, Odisha',
  dateLabel: '30–31 January 2027',
  hero: {
    title: 'The Wedding',
    titleAccent: 'Premiere',
    tagline: 'Two families. So many reasons to celebrate.',
    synopsis: 'A wedding marks the beginning of a new chapter. And with it comes the joy of bringing families and friends together for a celebration to be remembered.',
    action: 'Click to unfold the celebrations',
  },
  celebrations: { title: 'The celebrations.', intro: 'Henna, music, colour and the wedding.', detailsAction: 'Click here for event details' },
  closing: {
    title: 'With Love and Warm Regards',
    rsvp: 'Rsvp.',
    assistance: 'For any assistance or queries, kindly contact:',
    compliments: 'With Best Compliments from',
    message: 'Your presence and blessings will make the celebrations even more memorable!',
  },
  families: {
    groomParents: 'Smt. Sutapa and Shri Srinibash Patnaik',
    brideParents: 'Smt. Kanchan and Late Shri Sunil Gami',
    compliments: 'The Patnaik Family',
    regards: 'Srinibash, Sutapa, Suhani and Subhasis',
  },
  invocation: 'Om Shri Shri Prajapataye Namah',
  ganeshSymbol: '/media/ganesh-symbol.svg',
  monogramImage: '/media/wedding-monogram.svg',
  wardrobePlanner: '/media/wardrobe-planner.pdf',
  textures: { velvet: '/media/velvet-texture.png', parchment: '/media/parchment-texture.png' },
  ornaments: { canopy: '/media/botanical-canopy.png', petal: '/media/rose-petal.png' },
  venueArtwork: { veiled: '/media/venue-glimpse.jpg', revealed: '/media/venue-glimpse-revealed.jpg' },
  blessing: 'May Lord Jagannath bless the newly weds with a life of love, harmony, good health, prosperity, and perpetual togetherness.',
  contacts: [
    { name: 'Srinibash Patnaik', phone: '+91-9937556812', href: 'tel:+919937556812' },
    { name: 'Sutapa Patnaik', phone: '+91-9438532193', href: 'tel:+919438532193' },
    { name: 'Subhasis Pattnaik', phone: '+91-8117886632', href: 'tel:+918117886632' },
  ],
  // Google Maps listing for Green Heaven Resort, not the similarly named Green Haven.
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${resort.latitude},${resort.longitude}&query_place_id=${resort.placeId}`,
  // Pin the exact feature; a free-text name search can select another state.
  mapEmbedUrl: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${resort.longitude}!3d${resort.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s${resort.featureId}!2sGreen%20Heaven%20Resort!5e0!3m2!1sen!2sin!4v1791907200000!5m2!1sen!2sin`,
  countdownDate: '2027-01-30T00:00:00+05:30',
    media: { heroImage: '/media/cinematic-portrait.jpg', storyImage: '', trailerVideo: '/media/teaser-portrait.mp4', trailerPoster: '/media/teaser-first-frame.jpg', invitationVideo: '', openingVideo: '/media/opening-landscape.mp4', openingVideoPortrait: '/media/opening-portrait.mp4', openingPoster: '/media/opening-poster.jpg', backgroundMusic: '/media/kudmayi-instrumental.mp3' },
}
export type InvitationContent = {
  request: string
  invocation: string
  blessing: string
  coupleOrder: readonly ('bride' | 'groom')[]
  showTeaser: boolean
  closing: { contacts: typeof wedding.contacts; familyName?: string; names: string }
}
const sharedInvitation: InvitationContent = {
  request: 'We earnestly request the honour of your esteemed presence and favour of your bountiful blessings on the felicitous wedding ceremony of',
  invocation: wedding.invocation,
  blessing: wedding.blessing,
  coupleOrder: ['groom', 'bride'],
  showTeaser: false,
  closing: { contacts: wedding.contacts, familyName: wedding.families.compliments, names: wedding.families.regards },
}
export const invitationProfiles: Record<'shared' | 'bride' | 'groom', InvitationContent> = {
  shared: sharedInvitation,
  bride: {
    ...sharedInvitation,
    showTeaser: true,
    coupleOrder: ['bride', 'groom'],
    closing: {
      contacts: [
        { name: 'Ayush Gami', phone: '+91-8340299405', href: 'tel:+918340299405' },
        { name: 'Abhishek Gami', phone: '+91-9903841151', href: 'tel:+919903841151' },
      ],
      names: 'Kanchan, Ayush, Archana, Abhishek, Miransh',
    },
  },
  groom: { ...sharedInvitation, showTeaser: false },
}
export function getInvitationContent(pathname: string): InvitationContent {
  const path = pathname.replace(/\/+$/, '').toLowerCase()
  if (path === '/aastha') return invitationProfiles.bride
  if (path === '/sohan') return invitationProfiles.groom
  return invitationProfiles.shared
}
export const events: WeddingEvent[] = [
  { id: '01', day: '30', name: 'Band Baaja Mehendi', category: 'Mehendi', theme: 'mehendi', image: '/media/mehendi-poster.png',
    tagline: 'Dhol, mehendi aur dher saari masti.', short: 'A little henna. A whole lot of happiness.',
    description: 'A moment of golden hues, when love is intricately woven into exquisite patterns of henna.',
    schedule: [{ name: 'Mehendi', time: '9:00 a.m. onwards', note: 'Followed by lunch' }],
    dressCode: [{ men: 'Kurta-pyjama sets with Nehru jackets.', women: 'Lehengas, shararas, ghararas or Anarkalis.' }],
    outfitMood: 'Playful prints, flowing silhouettes, and festive colour.',
    men: 'Kurta-pyjama sets, printed or solid, with Nehru jackets.', women: 'Flowy lehengas, shararas, ghararas, and Anarkalis.',
    colors: [{ name: 'Emerald', hex: '#2c7453' }, { name: 'Rani pink', hex: '#cd366f' }, { name: 'Marigold', hex: '#e5b64a' }, { name: 'Ivory', hex: '#eee2c7' }] },
  { id: '02', day: '30', name: 'Jhoom Barabar Jhoom', category: 'Sangeet', theme: 'sangeet', image: '/media/sangeet-poster.png',
    tagline: 'All the drama. All the dance.', short: 'For the main characters on the dance floor.',
    description: 'An evening of celebratory melodies, filled with music, dance, boundless fun and laughter.',
    schedule: [{ name: 'Sangeet', time: '6:00 p.m. onwards', note: 'Followed by dinner' }],
    dressCode: [{ men: 'Bandhgala suits, tuxedos or tailored suits.', women: 'Sequined sarees, shimmer lehengas or metallic gowns.' }],
    outfitMood: 'A little shimmer is good. A lot of shimmer is even better.',
    men: 'Bandhgala suits, tuxedos, or tailored suits.', women: 'Sequined sarees, shimmer lehengas, and metallic gowns.',
    colors: [{ name: 'Midnight', hex: '#222336' }, { name: 'Wine', hex: '#9c3459' }, { name: 'Champagne', hex: '#ceb795' }, { name: 'Silver', hex: '#b9baca' }] },
  { id: '03', day: '31', name: 'Ajab Haldi Ki Gazab Kahani', category: 'Haldi', theme: 'haldi', image: '/media/haldi-poster.png',
    tagline: 'Colour, flowers, and a little friendly chaos.', short: 'Light outfits. A colourful celebration.',
    description: 'A sunshine soiree where blooming florals, vibrant turmeric hues and joyous celebrations come together in a carnival of flowers.',
    schedule: [{ name: 'Haldi and Carnival', time: '9:00 a.m. onwards', note: 'Followed by lunch' }],
    dressCode: [
      { men: 'Linen or floral pastel shirts with chinos and blazers, or kurta-pyjama sets.', women: 'Pastel shararas, floral co-ords or skirts with crop tops.' },
    ],
    outfitMood: 'Light, breezy, and made for a carnival. Think pastels and florals.',
    men: 'Linen or floral pastel shirts with chinos and blazers, or kurta-pyjama sets.', women: 'Pastel light shararas, floral co-ord sets, skirts with crop tops, or cape sets.',
    colors: [{ name: 'Sunshine', hex: '#e5b54c' }, { name: 'Peach', hex: '#e5ad95' }, { name: 'Sage', hex: '#9da881' }, { name: 'Blush', hex: '#e3bec5' }] },
  { id: '04', day: '31', name: 'Two Souls, One Love', category: 'Wedding and Reception', theme: 'shaadi', image: '/media/wedding-poster.png',
    tagline: 'Two families. One wedding.', short: 'The main event: Wedding and Reception.',
    description: 'With the beats of the dhol and hearts full of joy, join us for the vibrant rhythms and celebrations of the baraat procession. Witness the beautiful exchange of garlands as two hearts embrace a promise of eternity. An enchanting evening of warm smiles, heartfelt blessings and memories to cherish forever. Join us as the couple takes their sacred vows around the holy fire, beginning an eternal journey.',
    schedule: [{ name: 'Baraat', time: '5:00 p.m. onwards' }, { name: 'Varmala', time: '7:30 p.m. onwards' }, { name: 'Reception', time: '7:30 p.m. onwards' }, { name: 'Pheras', time: '11:00 p.m. onwards' }],
    dressCode: [{ men: 'Sherwanis, bandhgala suits, achkans or silk kurtas.', women: 'Lehengas or silk sarees.' }],
    outfitMood: 'Heritage with high glamour. North and South Indian elegance.',
    men: 'Regal sherwanis, bandhgala suits, achkans, or silk kurtas with churidars.', women: 'Opulent lehengas or classic silk sarees.',
    colors: [{ name: 'Burgundy', hex: '#732f39' }, { name: 'Antique gold', hex: '#c3a365' }, { name: 'Forest', hex: '#284638' }, { name: 'Ivory', hex: '#eee2c7' }] },
]