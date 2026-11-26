# Wedding media slots

Place approved original assets in public/media and configure the paths in src/content.ts. Empty paths intentionally render labelled artwork, never unrelated stock photos.

| Slot | Suggested asset | Production brief |
|---|---|---|
| openingVideo | opening-landscape.mp4 | Supplied Firefly architectural film, 1920×1080 H.264, 8 seconds, web-optimized with fast-start. Sound-free. Starts after clicking the seal; finishes by opening the site. Guests can enter at any time. Reduced-motion guests choose whether to play. |
| openingVideoPortrait | opening-portrait.mp4 | 608×1080 centre crop of the same film, preserving the entrance and approach without stretching. Selected in portrait orientation, including after device rotation. |
| openingPoster | opening-poster.jpg | First frame of the supplied film; responsive centre crop while loading or paused. |
| heroImage | hero.webp | 2400×1400, couple on the right, empty dark burgundy area on the left for titles. Beige/champagne highlights, cinematic lighting. |
| storyImage | story.webp | 1400×1000, natural couple portrait in warm tones. |
| Event image fields | mehendi.webp, sangeet.webp, haldi.webp, shaadi.webp | 1000×1400 portrait posters. Keep faces/details in upper half; site overlays titles below. Mehendi: rose/terracotta; Sangeet: burgundy/shimmer; Haldi: warm gold/pastels; Shaadi: red/heritage champagne. |
| trailerVideo | teaser-portrait.mp4 | Supplied proposal teaser, cropped to 404×720 to remove embedded black side bars, with visible playback controls. |
| invitationVideo | invitation.mp4 | Optional invitation film inside the invitation dialog. |
| backgroundMusic | kudmayi-instrumental.mp3 | Supplied instrumental track, looping at 30% volume after the seal click. One persistent player across the intro and main site; pause/resume is available throughout, including dialogs. No playback before guest interaction or automatic restart after refresh. |

Do not bake text into posters; the site supplies responsive titles. Aim for images below 500 KB and short films below 15 MB. Only use media approved for public sharing. Do not copy Netflix logos, film posters, or the reference site's media.

The opening uses the supplied Downloads Firefly file whose name starts “Firefly Generate a 10-second photorealistic architectural video”. Its actual duration is 8 seconds; timing has not been stretched. The original remains untouched. Generated visuals are not verified resort photography. A failed video falls back to a clearly labelled CSS-animated preview, so guests cannot get trapped.

The scratch reveal is a real pointer/touch-operated canvas with a keyboard-accessible one-click alternative. It fully reveals after approximately 38% of the foil is cleared.