# React + TypeScript + Vite

## Wedding Invitation Links

One hostname serves `/aastha` (bride first), `/sohan` (groom first), and `/`
(shared invitation). The invitation dialog and closing RSVP details vary by
profile; the rest of the site stays shared. Guests never need to choose a side.

The default and groom invitations continue directly to the dates without a teaser page.
Only the bride invitation at `/aastha` retains the teaser. The `showTeaser` profile
setting controls this continuation; the click-to-open entrance film is unchanged.

Edit `invitationProfiles` in `src/content.ts` for each side's request,
invocation, blessing, couple order, RSVP contacts, and compliments names. Both versions use general invitation
wording, with the corresponding name first. There is no host heading. Both
preserve the confirmed parent details and the formal request from the PDF.

Vite supports direct links and refresh. Production hosting must serve
`index.html` for `/aastha` and `/sohan` while preserving the URL (SPA fallback).
These links personalise content; they are not access restrictions.

Run `npm run dev` for local preview. Validate with `npm run build`,
`npm run lint`, and `npm run test:e2e -- --workers=2`.

## Sharing Metadata

The title, description and social preview are shared across all invitation
routes and reveal no names, dates or venue. Edit `wedding.metadata` in
`src/content.ts`; Vite writes these tags into the initial HTML, without requiring
JavaScript or guest entry.

Set `SITE_URL=https://your-domain.example` in the hosting build environment for
absolute social-image URLs. Vercel's `VERCEL_PROJECT_PRODUCTION_URL` is also
supported automatically. Development previews automatically use each allowed
request hostname, so ngrok restarts do not leave stale thumbnail URLs. Production
builds still need the permanent URL setting; otherwise they use a relative image
path. Restart Vite after changing this setting. No temporary ngrok hostname is
embedded in the source or production build.

The sharing thumbnail is the supplied Burgundy Velvet Celebration Invitation
artwork. The original remains at `public/media/celebration-awaits.png` (1672 x
941); sharing uses the full-composition `public/media/celebration-awaits.jpg`
(1200 x 675, approximately 117 KB) instead of the 2.1 MB PNG. It shows the SA wax
seal and "A celebration awaits." No dates or venue details are shown. Its path,
MIME type, dimensions and alt text live in `wedding.metadata`.
Regenerate it with `node scripts/optimize-sharing-image.mjs
public/media/celebration-awaits.png public/media/celebration-awaits.jpg`.
The page title, description and envelope favicon are unchanged.
The envelope favicon is available as both SVG and `public/favicon.ico` for
crawlers that request the conventional fallback path. Regenerate the ICO with
`node --experimental-strip-types scripts/generate-favicon.mjs`.

## Venue Backdrop

The supplied Golden Garden Wedding Pavilion artwork is decorative atmosphere,
not a photograph identifying the resort. Two pre-blurred JPEGs keep it soft
before and after reveal; only opacity transitions, with no motion under reduced
motion settings. The map, venue details and reveal geometry are unchanged.
Paths live in `wedding.venueArtwork` in `src/content.ts`.

Regenerate with `node --experimental-strip-types scripts/generate-venue-artwork.mjs
"/path/to/Golden Garden Wedding Pavilion.png"`.

## Botanical Artwork

The dates canopy and small falling petal PNGs are adapted from Pierre-Joseph
Redoute's rose study, listed as public domain on
[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pierre_Joseph_Redout%C3%A9_._Rose_MNHA.jpg).
They are not assets from the InviteMaker reference templates.

Reproduce them with `node scripts/generate-botanical-assets.mjs`, or supply a
downloaded source JPEG as its first argument. The generator uses the existing
Playwright dependency to crop and mask the painting into transparent PNGs.
Asset paths are stored in `wedding.ornaments` in `src/content.ts`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
