# Artwork

Created using the built-in ImageGen tool, rather than copied from Dribbble or Pinterest. The supplied reference established the atmosphere and composition; no image from it is shipped in this project.

## `public/assets/sky.webp`

Generation brief: panoramic cinematic high-altitude cloud sea at sunset; deep teal blue on the left, peach and pale gold on the right; a faint enormous planet in the upper right; tiny distant floating islands; mostly open sky in the center and dense clouds in the bottom third. Premium realistic fantasy matte painting, no foreground island, characters, interface, text or logos.

## `public/assets/island.webp`

Generation brief: an isolated floating island with an ancient ivory city, slim Gothic towers and a needle-like central castle; emerald trees, pale terraces, moss-covered jagged rock tapering down; two luminous waterfalls. Three-quarter view from slightly below, golden sunset light from the upper right, blue ambient shadows. Detailed cinematic fantasy materials, transparent background, no clouds, text, logos or people.

## `public/assets/heroine-refined.webp`

Generation brief: an adult blonde fantasy heroine seen from behind in polished silver-white plate armor with gold accents and luminous ice-blue lines; voluminous long blonde waves with a crown braid and pale blue strands; pristine midnight-blue embroidered silk cape flowing left. Regal cinematic fantasy realism. Preserve the standing pose, character scale, warm sunset rim light, mossy cliff, flowers and transparent background.

The original traveller was edited with the built-in ImageGen tool into a blonde woman, then into the armored heroine. The current artwork keeps the original composition for the cape shader. A further ImageGen edit replaces the braided curls with broad sculpted waves and clarifies the back anatomy and the shoulder attachment of the preserved embroidered cape. Previous generated sources remain in the generation tool's directory.

The generated PNGs were converted to WebP using Sharp, retaining transparency. The original generation files remain in the tool’s generated-images directory. The cape is deformed locally in the vertex shader, using a tapered mask in texture coordinates that excludes the hair, armor, legs and cliff. The foreground uses a separate fixed camera, so pointer parallax does not move the woman.

Cloud wisps, particle glows and marble textures are created procedurally in the browser. Favicon and brand mark are original geometric SVGs. Interface typefaces are Manrope and Cormorant Garamond from Google Fonts.

## Storybook redesign

All replacement artwork was generated with the built-in ImageGen tool. User-supplied anime armor, Drake portraits and landscape images served as visual references only; the supplied images and their signatures are not distributed.

- `island-story.webp`: wide grassy floating plateau, rounded weathered bedrock, cloud-covered foundation, ivory village, a blue-roofed castle, trees and waterfalls. Replaces repetitive pointed rock teeth.
- `heroine-story.webp`: adult blonde knight, loose natural hair, ivory cloth and pale steel/gold armor, azure embroidered cape, no wings. Separate fixed foreground plane; cape has localized shader motion.
- `story/01-home.webp`: child and ordinary baker parents preparing bread in a warm bakery; mother's blue apron.
- `story/02-fire.webp`: solitary crying child hugging the apron beside the burned house; departing hooded arsonist.
- `story/03-hand.webp`: child-focused scene and a large offered gloved hand; Drake's face remains outside the scene.
- `story/04-sword.webp`: wooden-sword training with white-haired scarred father figure Drake.
- `story/05-prince.webp`: heroine and short-haired young prince handing out bread; Drake nearby.
- `story/06-vayne.webp`: confrontation with a dark-clad lord, blue blade and burned settlement.
- `story/07-rain.webp`: solitary armored heroine kneeling in rain holding her mother's apron; sword on the ground and small duel memory in the mist.
- `story/08-wedding.webp`: heroine and prince wedding, Drake beside them, flowers, bread and the remembered apron.

Illustrations share soft painterly fantasy rendering and ivory, gold and azure colors. Generated PNGs retain their original locations under Codex's generated_images directory; optimized WebP copies ship with the project. Earlier island and foreground assets are retained as historical source assets but no longer referenced by the scene.

## Castle-focused revision

`island-castle.webp` replaces the broad meadow composition: grand layered ivory Gothic castle with azure roofs, a compact rounded floating foundation, restrained foliage and dusk light. Built-in ImageGen edit from `island-story.webp`; no bright meadow foreground or repeated pointed rock teeth. Scene exposure is restrained and three smaller floating islands frame the main castle.

## Cloud flight transition

`cloud-flight.webp`: built-in ImageGen-generated transparent cinematic cloud bank with detailed cumulus forms, blue-grey shadow folds and subdued dusk rim light. Three independently animated copies cross the viewport and cover the scene change. No uniform color overlay is used. Camera flight remains visible until clouds arrive; only the passing cloud layers receive depth-dependent blur; the castle remains crisp. The cloud passage is continuous, and the scene switches near its midpoint.
