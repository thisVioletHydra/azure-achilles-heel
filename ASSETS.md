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
