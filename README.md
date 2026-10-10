# Azure Achilles’ Heel

An atmospheric portfolio experience: a floating city, a blonde heroine in luminous armor and a flowing blue cape, and a journey into an ivory pavilion above the clouds.

## Run locally

Node.js 22.12+ or 24+, pnpm 12.11.2 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Create a production build with `pnpm build`; preview it with `pnpm preview`.

## Experience

- Three sky panels reveal the scene at different speeds once its artwork is ready; reduced motion uses a brief fade.
- Independent floating islands, drifting clouds, animated waterfalls and light particles.
- Subtle pointer-driven parallax for the distant world; the heroine stays fixed.
- A traveller’s cape animated with a vertex shader; the person and ledge stay anchored.
- Start your journey: a camera flight into a 3D courtyard, with a cloud transition between the illustrated city exterior and the geometry.
- An ivory pavilion, particle fountain, expanding water ripples and moving armillary sphere.
- Routes to the observatory and garden, and a return to the initial view.
- A guided 84-second tour, atlas and story dialogs.
- Responsive interface, keyboard controls and reduced-motion preferences. Animation pauses when the browser tab is hidden.

Click **Start your journey** to enter. Inside the city, use the route buttons or Left/Right arrow keys; Escape returns to the clouds.

## Implementation

Vite + native JavaScript + Three.js. Accessible HTML controls sit above a WebGL canvas. The exterior uses generated transparent artwork on independently animated planes; the courtyard is procedural 3D. This is a hybrid experience, not a fully modeled version of the painted city.

`src/main.js` handles navigation, dialogs and the guided tour. `src/world.js` handles scene geometry, shaders, lighting and camera animation. Styles live in `src/style.css` and `src/motion.css`.

WebGL is required for the journey. Without it, the background, story and atlas remain available. Google Fonts serves Manrope and Cormorant Garamond, with local system-font fallbacks. No analytics, accounts, backend or visitor-data storage.

Artwork provenance and generation briefs are recorded in `ASSETS.md`. All runtime artwork is stored locally in `public/assets/` as optimized WebP files.

## Status

Local implementation. No public deployment or award claim. The Awwwards reference is the creative target, not a certification.
