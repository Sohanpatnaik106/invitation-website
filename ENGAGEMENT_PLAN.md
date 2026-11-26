# Guest engagement flow

## Principles
- Guide guests with one clear next action per component; no scroll-jacking or timed wait to unlock details.
- Every playful interaction must have a keyboard/tap alternative and reduced-motion support.
- Preserve a continuous cinematic scrolling website, NOT a step-by-step wizard or screen replacement.
- Parents’ invitation → scroll to teaser → scroll to dates → programme, outfits, destination and guest guide on the same page. Newly introduced sections stay mounted so guests can freely scroll back.
- One clear next-section link where helpful. No numbered steps, Back/Next screen navigation, or completion dashboard. Header/footer shortcuts scroll to existing sections.
- The teaser is explicitly presented before the dates, with a clear Play action and an accessible continue-without-video alternative. No forced viewing duration or compulsory RSVP submission.
- The date and venue reveals have immediate, keyboard-accessible buttons; scratching is optional.
- No automatic sound, fabricated personal story, or misleading RSVP confirmation.

## Component journey
| Component | Guest action | Reward / next step | Status |
|---|---|---|---|
| Wax seal | Click or press Enter | Full-screen opening sequence | Implemented |
| Opening film | Watch, or enter at any time | First visual glimpse, without date/venue captions; no video trap | Supplied Firefly film implemented |
| Homepage invitation | Play invitation | Parents’ formal card; its only forward action is Watch our teaser | Implemented |
| Teaser | Play video, or continue without video | Editorial portrait film section before dates; background music pauses during playback | Implemented |
| Scratch dates | Scratch foil, or choose reveal button | Date reveal, calendar download, then Explore the celebrations | Implemented; revealed state retained when scrolling back |
| Event episodes | Filter by day and open a poster | Event details, dress code; link to selected wardrobe tab | Implemented; confirmed timings pending |
| Wardrobe | Select tabs, compare colours | Dress guidance and downloadable planner | Implemented; outfit illustrations pending |
| Venue and map | Reveal the destination, then open directions | Venue name, city, exact map pin and travel/stay guidance appear together | Implemented; optional resort gallery pending |
| Guest FAQ | Expand relevant questions | Answers without clutter | Implemented |
| Guest plans / finale | Read brief FAQs or preview RSVP | No response required; normal scrolling remains available | Local-only demo; real destination pending |
| Header / footer | Revisit introduced sections | In-page scroll shortcuts; earlier content remains visible | Implemented |

## Next improvements, in priority order
1. Keep the original individual celebration poster cards, horizontal rail, day filters, and detail dialogs. Do not replace them with a consolidated itinerary grid.
2. Balance visible copy with the visuals: welcoming hero copy, a short teaser introduction, date-reveal context, individual event captions, and helpful section transitions. Do not strip sections down to headings and buttons. Longer practical notes live in expandable details; the formal invitation remains intentionally text-rich.
3. Replace placeholders with supplied film, portraits, episode posters, and outfit illustrations.
4. Add confirmed timings, travel guidance, and a real RSVP destination before deployment.
5. Evaluate reduced-motion, keyboard, touch scratching, small screens, and browser back/navigation after each change.

The scratch gesture is optional, not an attendance requirement. The reveal button immediately opens the same information. Once uncovered, dates remain available in the formal invitation and event schedule; the destination appears in the card only after its own reveal. No supplied parent honorifics are expanded or interpreted without confirmation. Core facts are repeated only when needed for a self-contained invitation or a practical event reference, not as decorative copy in every section.

Music starts on the seal click and loops across the guest journey. Playing the teaser pauses it; pausing/ending/scrolling away from the teaser restores only music that was previously on. Offscreen teaser playback is paused to avoid audio from a film guests are no longer watching.