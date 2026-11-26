# Wedding website conventions

- Store wedding details and asset paths in src/content.ts.
- Current branding: burgundy, beige, and champagne; hashtag is #aastheticsohlmates.
- No venue, ceremony times, family names, or relationship milestones may be invented.
- Keep the click-to-open entrance. No main UI should be rendered before the guest enters.
- Missing film assets must use a clearly labelled animated preview. A failed video must not trap guests.
- Preserve touch/pointer scratching and a keyboard-accessible reveal alternative.
- Respect reduced-motion settings. No automatic audio.
- RSVP is currently a local-only demo, not a submitted response.
- Keep copy understated and celebration-focused: family, music, outfits, and guest plans. Avoid repetitive love/forever/soulmate lines; retain only a light romantic touch.
- Run npm run build, npm run lint, and npm run test:e2e after interactive changes.