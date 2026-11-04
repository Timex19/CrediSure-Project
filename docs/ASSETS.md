# Demo profile portraits

Final asset: `frontend/public/images/demo-portraits.webp` (183,460 bytes; 1254 × 1254 pixels).

Generated using the built-in image generation tool. The original generated PNG was encoded to WebP at quality 0.86, preserving its dimensions and composition, to reduce transfer size from 2,384,612 bytes by approximately 92%. No cropping, retouching or identity edits were applied to the source. The original generation artifact remains outside the repository.

The asset contains 16 fictional adult portraits in a 4 × 4 grid. `UserAvatar` selects a cell using a stable synthetic user ID and displays it as a circular portrait. The same 16 images are reused across the 80 demo profiles. They are illustrative images, not verified photographs of the named people. No external image service, real user photo, uploaded personal information or runtime image-generation request is involved.

The avatar reserves its dimensions, loads lazily, uses asynchronous image decoding and leaves readable initials when loading fails. It is hidden from assistive technology because the adjacent text already names the user.

## Generation prompt

> Create a single square 1024x1024 contact sheet for fictional demo user avatars. EXACT layout: 4 columns by 4 rows, 16 equal square cells, no gutters, no borders, no text, no watermark. Each cell contains ONE DIFFERENT person centered, front facing shoulders-up natural professional photographic headshot. All subjects are fictional adults from Nigeria, Black African appearance, eight men and eight women alternating, a thoughtful range of skin tones, hairstyles, ages 24 to 55, natural expressions, smart casual clothing without logos. Each face fully visible and centered horizontally and vertically in its own cell so the cell can be shown as a tiny circular avatar. Consistent soft studio light. Each cell background is a simple solid muted cream, sage or warm gray. Photorealistic yet clearly a synthetic demo portrait library. No resemblance to celebrities, no collage overlap, exactly 16 distinct heads. Arrange 4 by 4 precisely, every head entirely within its cell, same camera distance, centered eyes. Save the final project-bound asset to C:\CrediSure-Assessment\frontend\public\images\demo-portraits.png if filesystem output is supported; otherwise provide the generated image artifact.

The tool returned a 1254 × 1254 image; the grid uses proportional positions and does not depend on the originally requested resolution.
